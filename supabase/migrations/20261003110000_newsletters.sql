-- A newsletter-only dispatch secret avoids depending on the missing shared
-- scheduler credential or storing a service-role key in a new cron command.
do $$
begin
  if not exists(select 1 from vault.secrets where name='newsletter_dispatch_key') then
    perform vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'newsletter_dispatch_key', 'Authorizes newsletter queue dispatch only');
  end if;
end $$;
create function private.newsletter_dispatch_headers()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare token text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name='newsletter_dispatch_key' order by updated_at desc limit 1;
  if coalesce(token,'')='' then raise exception 'Newsletter dispatch secret missing'; end if;
  return jsonb_build_object('Content-Type','application/json','x-newsletter-dispatch-token',token);
end $$;
create function public.newsletter_verify_dispatch(p_token text)
returns boolean language sql security definer set search_path = '' as $$
  select length(p_token)=72 and exists(select 1 from vault.decrypted_secrets where name='newsletter_dispatch_key' and decrypted_secret=p_token);
$$;
revoke all on function private.newsletter_dispatch_headers(), public.newsletter_verify_dispatch(text) from public, anon, authenticated;
grant execute on function private.newsletter_dispatch_headers(), public.newsletter_verify_dispatch(text) to service_role;

-- Admin-only newsletter workspace. Sending is performed by a durable queue,
-- never by a browser holding the Resend secret.
create table public.newsletter_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  first_name text not null default '', last_name text not null default '',
  kind text not null default 'prospect' check (kind in ('client','prospect')),
  categories text[] not null default '{}' check (categories <@ array['landlord','seller','renter','buyer']::text[]),
  source text not null default 'csv',
  excluded boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.newsletters (
  id uuid primary key default gen_random_uuid(),
  name text not null, subject text not null, html text not null,
  status text not null default 'draft' check (status in ('draft','queued','completed','cancelled')),
  revision integer not null default 1,
  sender text, scheduled_at timestamptz, worker_error text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletters(id),
  contact_id uuid not null references public.newsletter_contacts(id),
  email text not null, unsubscribe_token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','skipped','attention')),
  attempts integer not null default 0, first_attempt_at timestamptz,
  retry_at timestamptz not null default now(), lease_until timestamptz,
  provider_id text, error text, sent_at timestamptz,
  unique(newsletter_id, email)
);
create index newsletter_deliveries_queue on public.newsletter_deliveries(status, retry_at);
create index newsletter_contacts_categories on public.newsletter_contacts using gin(categories);

alter table public.newsletter_contacts enable row level security;
alter table public.newsletters enable row level security;
alter table public.newsletter_deliveries enable row level security;
create policy newsletter_contacts_admin_read on public.newsletter_contacts for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy newsletters_admin_read on public.newsletters for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy newsletter_deliveries_admin_read on public.newsletter_deliveries for select to authenticated using (public.has_role(auth.uid(), 'admin'));
revoke all on public.newsletter_contacts, public.newsletters, public.newsletter_deliveries from anon, authenticated;
grant select on public.newsletter_contacts, public.newsletters, public.newsletter_deliveries to authenticated;
grant all on public.newsletter_contacts, public.newsletters, public.newsletter_deliveries to service_role;

-- Reimports add categories, retain exclusions and never downgrade a client.
create function public.newsletter_import_contacts(p_rows jsonb, p_kind text, p_categories text[], p_source text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_kind not in ('client','prospect') or cardinality(p_categories) = 0 or not p_categories <@ array['landlord','seller','renter','buyer']::text[] then
    raise exception 'Catégorie ou type invalide';
  end if;
  insert into newsletter_contacts(email, first_name, last_name, kind, categories, source)
  select lower(trim(x.email)), coalesce(x.first_name,''), coalesce(x.last_name,''), p_kind, p_categories, p_source
  from jsonb_to_recordset(p_rows) as x(email text, first_name text, last_name text)
  on conflict (email) do update set
    first_name = coalesce(nullif(excluded.first_name,''), newsletter_contacts.first_name),
    last_name = coalesce(nullif(excluded.last_name,''), newsletter_contacts.last_name),
    kind = case when newsletter_contacts.kind = 'client' then 'client' else excluded.kind end,
    categories = array(select distinct unnest(newsletter_contacts.categories || excluded.categories)),
    updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;

-- One transaction freezes the content + selected recipient snapshot. A second
-- click cannot requeue the same draft. Existing opt-outs are always excluded.
create function public.newsletter_enqueue(p_id uuid, p_revision integer, p_ids uuid[], p_scheduled timestamptz, p_sender text)
returns integer language plpgsql security definer set search_path = public as $$
declare campaign newsletters; n integer;
begin
  select * into campaign from newsletters where id=p_id for update;
  if campaign.id is null or campaign.status <> 'draft' or campaign.revision <> p_revision then raise exception 'Brouillon modifié ou déjà programmé. Rechargez la page.'; end if;
  if cardinality(p_ids) is null or cardinality(p_ids)=0 or cardinality(p_ids)>10000 then raise exception 'Sélection invalide (1 à 10 000 contacts)'; end if;
  if p_scheduled < now()-interval '1 minute' or p_scheduled > now()+interval '30 days' then raise exception 'Date invalide'; end if;
  begin
    perform private.newsletter_dispatch_headers();
  exception when others then
    raise exception 'Programmation indisponible : configurer le secret serveur du planificateur avant tout envoi.';
  end;
  insert into newsletter_deliveries(newsletter_id,contact_id,email)
  select p_id,id,email from newsletter_contacts c where c.id=any(p_ids) and not c.excluded
    and not exists(select 1 from email_unsubscribes u where lower(u.email)=c.email)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n=0 then raise exception 'Aucun destinataire éligible'; end if;
  insert into email_unsubscribe_tokens(email,token)
    select email,unsubscribe_token::text from newsletter_deliveries where newsletter_id=p_id;
  update newsletters set status='queued',sender=p_sender,scheduled_at=p_scheduled,revision=revision+1,updated_at=now() where id=p_id;
  return n;
end $$;

-- Each lease belongs to an immutable recipient. Expired leases retry with the
-- same provider idempotency key, only within its 24-hour validity window.
create function public.newsletter_claim()
returns setof public.newsletter_deliveries language plpgsql security definer set search_path = public as $$
begin
  update newsletter_deliveries set status='attention',error='Résultat incertain : vérifier Resend avant toute relance.'
    where status in ('processing','pending') and (first_attempt_at < now()-interval '23 hours' or (attempts>=8 and lease_until<now()));
  return query
  with next as (
    select d.id from newsletter_deliveries d join newsletters n on n.id=d.newsletter_id
    where n.status='queued' and n.scheduled_at<=now()
      and ((d.status='pending' and d.retry_at<=now()) or (d.status='processing' and d.lease_until<now()))
      and d.attempts<8
    order by n.scheduled_at,d.id for update of d skip locked limit 1
  ) update newsletter_deliveries d set status='processing',attempts=attempts+1,
    first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '5 minutes'
    from next where d.id=next.id returning d.*;
end $$;
create function public.newsletter_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from newsletters where id=p_id for update;
  if not exists(select 1 from newsletters where id=p_id and status='queued' and scheduled_at>now()) then
    raise exception 'Seule une campagne future peut être annulée';
  end if;
  update newsletters set status='cancelled',updated_at=now() where id=p_id;
  update newsletter_deliveries set status='skipped',error='Campagne annulée' where newsletter_id=p_id and status='pending';
end $$;
create function public.newsletter_finish()
returns void language sql security definer set search_path = public as $$
  update newsletters n set status='completed',updated_at=now() where status='queued'
    and not exists(select 1 from newsletter_deliveries d where d.newsletter_id=n.id and d.status in ('pending','processing'));
$$;
revoke all on function public.newsletter_import_contacts(jsonb,text,text[],text), public.newsletter_enqueue(uuid,integer,uuid[],timestamptz,text), public.newsletter_claim(), public.newsletter_cancel(uuid), public.newsletter_finish() from public, anon, authenticated;
grant execute on function public.newsletter_import_contacts(jsonb,text,text[],text), public.newsletter_enqueue(uuid,integer,uuid[],timestamptz,text), public.newsletter_claim(), public.newsletter_cancel(uuid), public.newsletter_finish() to service_role;

-- Vault returns the scoped dispatch token only to the scheduler, never to clients.
select cron.schedule('newsletter-dispatch','* * * * *', $$
  select net.http_post(
    url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/newsletter-worker',
    headers := private.newsletter_dispatch_headers(), body := '{}'::jsonb, timeout_milliseconds := 60000
  );
$$);

create function public.newsletter_record_optouts(p_emails text[])
returns void language sql security definer set search_path = public as $$
  insert into email_unsubscribes(email,campaign_key,source)
  select distinct lower(trim(e)),null,'resend_newsletter_sync' from unnest(p_emails) e
  where not exists(select 1 from email_unsubscribes u where lower(u.email)=lower(trim(e)))
  on conflict do nothing;
$$;
revoke all on function public.newsletter_record_optouts(text[]) from public, anon, authenticated;
grant execute on function public.newsletter_record_optouts(text[]) to service_role;
