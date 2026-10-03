-- Credentials already provisioned in Vault, never in migrations or frontend.
create function public.newsletter_infomaniak_credentials()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare config jsonb; token text;
begin
  select decrypted_secret::jsonb into config from vault.decrypted_secrets where name='infomaniak_newsletter_config';
  select decrypted_secret into token from vault.decrypted_secrets where name='infomaniak_newsletter_api_key';
  if config is null or coalesce(token,'')='' then raise exception 'Infomaniak Newsletter non configuré'; end if;
  return config || jsonb_build_object('api_key',token);
end $$;
revoke all on function public.newsletter_infomaniak_credentials() from public, anon, authenticated;
grant execute on function public.newsletter_infomaniak_credentials() to service_role;

-- Do not migrate an in-flight Resend send to another provider.
do $$ begin
  if exists(select 1 from public.newsletters where status='queued') then
    raise exception 'Terminer ou annuler les campagnes Resend avant la migration';
  end if;
end $$;
alter table public.newsletters add column provider text not null default 'resend';
alter table public.newsletters alter column provider set default 'infomaniak';
alter table public.newsletters add column provider_campaign_id bigint;
alter table public.newsletters add column provider_domain_id bigint;
alter table public.newsletters add column provider_group_id bigint;
alter table public.newsletters add column dispatch_state text not null default 'preparing'
  check(dispatch_state in ('preparing','submitting','accepted','attention'));
alter table public.newsletters add column dispatch_token uuid;
alter table public.newsletters add column dispatch_lease timestamptz;
alter table public.newsletters add column dispatch_retry_at timestamptz not null default now();

-- One worker owns a campaign. Never replay a potentially successful schedule:
-- unlike Resend, Infomaniak does not document an idempotency key for this call.
create function public.newsletter_infomaniak_claim()
returns setof public.newsletters language plpgsql security definer set search_path = public as $$
begin
  update newsletters set dispatch_state='attention', worker_error='Résultat Infomaniak incertain : vérifier la campagne chez Infomaniak avant toute relance.'
  where status='queued' and provider='infomaniak' and dispatch_state='submitting' and dispatch_lease<now();
  update newsletter_deliveries d set status='attention',error=n.worker_error
  from newsletters n where d.newsletter_id=n.id and n.dispatch_state='attention' and d.status in ('pending','processing');
  return query with next as (
    select id from newsletters where status='queued' and provider='infomaniak' and scheduled_at<=now()
      and dispatch_state='preparing' and dispatch_retry_at<=now() and (dispatch_lease is null or dispatch_lease<now())
    order by scheduled_at for update skip locked limit 1
  ) update newsletters n set dispatch_token=gen_random_uuid(), dispatch_lease=now()+interval '5 minutes'
    from next where n.id=next.id returning n.*;
end $$;

create function public.newsletter_infomaniak_recipients(p_id uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform 1 from newsletters where newsletters.id=p_id and dispatch_token=p_token and dispatch_lease>now() and status='queued' and dispatch_state='preparing' for update;
  if not found then raise exception 'Verrou de campagne expiré'; end if;
  update newsletter_deliveries d set status='skipped',error='Contact exclu ou désinscrit'
  where newsletter_id=p_id and status='pending' and (
    exists(select 1 from newsletter_contacts c where c.id=d.contact_id and c.excluded)
    or exists(select 1 from email_unsubscribes u where lower(u.email)=d.email));
  return (select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'email',d.email) order by d.email),'[]'::jsonb) from newsletter_deliveries d where newsletter_id=p_id and status='pending');
end $$;

create function public.newsletter_infomaniak_begin_send(p_id uuid,p_token uuid,p_emails text[])
returns void language plpgsql security definer set search_path = public as $$
declare actual text[];
begin
  perform 1 from newsletters where id=p_id and dispatch_token=p_token and dispatch_lease>now() and status='queued' and dispatch_state='preparing' and provider_campaign_id is not null for update;
  if not found then raise exception 'Verrou de campagne expiré'; end if;
  select array_agg(x.email order by x.email) into actual from jsonb_to_recordset(newsletter_infomaniak_recipients(p_id,p_token)) as x(email text);
  if actual is null or actual is distinct from (select array_agg(e order by e) from unnest(p_emails) e) then
    raise exception 'Les destinataires ont changé : nouvelle vérification nécessaire';
  end if;
  update newsletters set dispatch_state='submitting',worker_error=null where id=p_id;
end $$;

create function public.newsletter_infomaniak_accept(p_id uuid,p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare campaign_id bigint;
begin
  select provider_campaign_id into campaign_id from newsletters where id=p_id and dispatch_token=p_token and dispatch_state='submitting' for update;
  if not found then raise exception 'État de campagne invalide'; end if;
  update newsletter_deliveries set status='sent',provider_id=campaign_id::text,sent_at=now(),error=null where newsletter_id=p_id and status='pending';
  update newsletters set status='completed',dispatch_state='accepted',dispatch_lease=null,worker_error=null,updated_at=now() where id=p_id;
end $$;

create table public.newsletter_test_requests (
  id uuid primary key, created_by uuid not null references auth.users(id),
  state text not null default 'preparing' check(state in ('preparing','submitting','accepted','attention')),
  provider_campaign_id bigint, error text, created_at timestamptz not null default now()
);
alter table public.newsletter_test_requests enable row level security;
revoke all on public.newsletter_test_requests from anon,authenticated;
grant all on public.newsletter_test_requests to service_role;

create or replace function public.newsletter_record_optouts(p_emails text[])
returns void language sql security definer set search_path = public as $$
  insert into email_unsubscribes(email,campaign_key,source)
  select distinct lower(trim(e)),null,'infomaniak_newsletter_sync' from unnest(p_emails) e
  where not exists(select 1 from email_unsubscribes u where lower(u.email)=lower(trim(e))) on conflict do nothing;
$$;
-- Old per-recipient Resend dispatcher must not claim Infomaniak campaigns.
create or replace function public.newsletter_claim()
returns setof public.newsletter_deliveries language plpgsql security definer set search_path = public as $$
begin raise exception 'Utiliser le dispatcher de campagnes Infomaniak'; end $$;

revoke all on function public.newsletter_infomaniak_claim(), public.newsletter_infomaniak_recipients(uuid,uuid), public.newsletter_infomaniak_begin_send(uuid,uuid,text[]), public.newsletter_infomaniak_accept(uuid,uuid) from public,anon,authenticated;
grant execute on function public.newsletter_infomaniak_claim(), public.newsletter_infomaniak_recipients(uuid,uuid), public.newsletter_infomaniak_begin_send(uuid,uuid,text[]), public.newsletter_infomaniak_accept(uuid,uuid) to service_role;

create or replace function public.newsletter_enqueue(p_id uuid, p_revision integer, p_ids uuid[], p_scheduled timestamptz, p_sender text)
returns integer language plpgsql security definer set search_path = public as $$
declare campaign newsletters; n integer; config jsonb;
begin
  config := newsletter_infomaniak_credentials();
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
  update newsletters set status='queued',provider='infomaniak',provider_domain_id=(config->>'domain_id')::bigint,sender=config->>'sender_email',scheduled_at=p_scheduled,revision=revision+1,updated_at=now() where id=p_id;
  return n;
end $$;


create function public.newsletter_infomaniak_skip(p_id uuid,p_token uuid,p_emails text[],p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from newsletters where id=p_id and dispatch_token=p_token and dispatch_lease>now() and dispatch_state='preparing' for update;
  if not found then raise exception 'Verrou de campagne expiré'; end if;
  update newsletter_deliveries set status='skipped',error=left(p_reason,300) where newsletter_id=p_id and status='pending' and email=any(p_emails);
end $$;
revoke all on function public.newsletter_infomaniak_skip(uuid,uuid,text[],text) from public,anon,authenticated;
grant execute on function public.newsletter_infomaniak_skip(uuid,uuid,text[],text) to service_role;
