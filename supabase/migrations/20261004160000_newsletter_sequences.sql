-- Durable lead nurturing. A client role, visit, trial or unsigned request is NOT conversion.
create table public.newsletter_sequences (
  category text primary key check(category in ('renter','buyer','seller','landlord','relocation','cleaning','commerce_buyer')),
  enabled boolean not null default false,
  steps jsonb not null default '[]',
  starts_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create table public.newsletter_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references newsletter_contacts(id),
  meta_lead_id uuid not null references meta_leads(id),
  form_id text,
  category text references newsletter_sequences(category),
  state text not null default 'active' check(state in ('active','review','stopped','completed')),
  reason text,
  enrolled_at timestamptz not null default now(),
  stopped_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.newsletter_sequence_messages (
  enrollment_id uuid not null references newsletter_sequence_enrollments(id),
  step integer not null check(step between 0 and 5),
  due_at timestamptz not null,
  newsletter_id uuid references newsletters(id),
  primary key(enrollment_id,step)
);
create index newsletter_sequence_due on newsletter_sequence_messages(due_at) where newsletter_id is null;
alter table newsletter_sequences enable row level security;
alter table newsletter_sequence_enrollments enable row level security;
alter table newsletter_sequence_messages enable row level security;
create policy sequence_admin_read on newsletter_sequences for select to authenticated using(has_role(auth.uid(),'admin'));
create policy enrollment_admin_read on newsletter_sequence_enrollments for select to authenticated using(has_role(auth.uid(),'admin'));
create policy sequence_message_admin_read on newsletter_sequence_messages for select to authenticated using(has_role(auth.uid(),'admin'));
revoke all on newsletter_sequences,newsletter_sequence_enrollments,newsletter_sequence_messages from anon,authenticated;
grant select on newsletter_sequences,newsletter_sequence_enrollments,newsletter_sequence_messages to authenticated;
grant all on newsletter_sequences,newsletter_sequence_enrollments,newsletter_sequence_messages to service_role;
insert into newsletter_sequences(category) select unnest(array['renter','buyer','seller','landlord','relocation','cleaning','commerce_buyer']);

create function public.newsletter_conversion_reason(p_email text) returns text
language plpgsql stable security definer set search_path=public as $$
begin
  -- Signed request and activation/payment are checked together. Mere presence of a request is insufficient.
  if exists(select 1 from demandes_mandat d where lower(trim(d.email))=lower(trim(p_email))
    and nullif(trim(d.signature_data),'') is not null and d.cgv_acceptees is true
    and d.statut='active') then return 'Mandat signé et service activé'; end if;
  -- Existing/manual accounts can have a contract directly on their client record.
  if exists(select 1 from clients c join profiles p on p.id=c.user_id
    where lower(trim(p.email))=lower(trim(p_email)) and p.actif is true and c.statut='actif'
      and nullif(trim(c.mandat_signature_data),'') is not null and c.mandat_date_signature is not null
      and (c.demande_mandat_id is null or exists(select 1 from demandes_mandat d
        where d.id=c.demande_mandat_id and d.statut='active')))
    then return 'Mandat signé et service activé'; end if;
  if exists(select 1 from mandates m where lower(trim(m.email))=lower(trim(p_email))
    and m.status='active' and m.signed_at is not null and nullif(trim(m.signature_data),'') is not null
    and m.activation_deposit_paid is true) then return 'Mandat signé et service activé'; end if;
  if exists(select 1 from proprietaires o join profiles p on p.id=o.user_id
    where lower(trim(p.email))=lower(trim(p_email)) and p.actif is true and o.statut='actif')
    then return 'Compte propriétaire actif'; end if;
  return null;
end $$;

create function public.newsletter_sequence_stop_reason(p_contact uuid) returns text
language plpgsql stable security definer set search_path=public as $$
declare c newsletter_contacts; reason text;
begin
  select * into c from newsletter_contacts where id=p_contact;
  if c.id is null then return 'Contact absent'; end if;
  if c.excluded or exists(select 1 from email_unsubscribes u where lower(trim(u.email))=c.email)
    or exists(select 1 from newsletter_contact_suppressions s where lower(trim(s.email))=c.email)
    then return 'Exclu ou désinscrit'; end if;
  if exists(select 1 from profiles p where lower(trim(p.email))=c.email and p.notifications_email is false)
    then return 'Emails désactivés dans le compte'; end if;
  reason:=newsletter_conversion_reason(c.email);
  return reason;
end $$;

create function public.newsletter_sequence_enroll_meta() returns trigger
language plpgsql security definer set search_path=public as $$
declare cl jsonb; cats text[]; category_key text; c newsletter_contacts; e uuid; cfg newsletter_sequences; why text;
begin
  -- Only fresh webhook INSERTs. Imports, backfills and reclassification never enroll historical leads.
  if new.source is distinct from 'meta_leadgen' then return new; end if;
  select * into c from newsletter_contacts where email=lower(trim(new.email));
  if c.id is null then return new; end if;
  cl:=newsletter_classify_meta(to_jsonb(new));
  if (cl->>'outside')::boolean then return new; end if;
  select array_agg(x) into cats from jsonb_array_elements_text(cl->'categories') x;
  if c.classification_manual then
    cats:=array(select x from unnest(c.categories) x where x<>'visit');
  end if;
  if cardinality(cats)=1 then category_key:=cats[1]; end if;
  select * into cfg from newsletter_sequences where category=category_key;
  -- Delayed webhook retries for old leads are not a new marketing request.
  if new.lead_created_time_meta is not null and new.lead_created_time_meta < coalesce(cfg.starts_at,(select min(starts_at) from newsletter_sequences)) then return new; end if;
  why:=newsletter_sequence_stop_reason(c.id);
  insert into newsletter_sequence_enrollments(contact_id,meta_lead_id,form_id,category,state,reason)
  values(c.id,new.id,new.form_id,cfg.category,
    case when why is not null then 'stopped' when cfg.enabled is true then 'active' else 'review' end,
    coalesce(why,case when cfg.enabled is not true then 'Formulaire ou séquence à configurer' end))
  on conflict(contact_id) do nothing returning id into e;
  if e is not null and why is null and cfg.enabled is true then
    insert into newsletter_sequence_messages(enrollment_id,step,due_at)
    select e,i-1,now()+make_interval(days=>day) from unnest(array[0,1,3,7,10,14]) with ordinality d(day,i);
  end if;
  return new;
end $$;
-- PostgreSQL fires equal-kind triggers alphabetically: run AFTER the contact import trigger.
create trigger zz_newsletter_sequence_meta after insert on meta_leads for each row execute function newsletter_sequence_enroll_meta();

create function public.newsletter_sequence_tick() returns integer
language plpgsql security definer set search_path=public as $$
declare r record; batch uuid; ids uuid[]; total integer:=0; creator uuid;
begin
  if not pg_try_advisory_xact_lock(741006041600::bigint) then return 0; end if;
  update newsletter_sequence_enrollments e set state='stopped',reason=new_reason,stopped_at=now(),updated_at=now()
  from (select id,newsletter_sequence_stop_reason(contact_id) new_reason from newsletter_sequence_enrollments where state in ('active','review')) s
  where e.id=s.id and s.new_reason is not null;
  -- A provider rejection or unsubscribe ends this enrollment instead of retrying a different step.
  update newsletter_sequence_enrollments e set state='stopped',reason='Dernier envoi exclu ou échoué',stopped_at=now(),updated_at=now()
  where e.state='active' and exists(select 1 from newsletter_sequence_messages m join newsletter_deliveries d
    on d.newsletter_id=m.newsletter_id and d.contact_id=e.contact_id where m.enrollment_id=e.id and d.status in ('skipped','failed'));
  update newsletter_sequence_enrollments e set state='completed',updated_at=now()
  where e.state='active' and exists(select 1 from newsletter_sequence_messages m join newsletter_deliveries d
    on d.newsletter_id=m.newsletter_id and d.contact_id=e.contact_id where m.enrollment_id=e.id and m.step=5 and d.status='sent');
  -- Campaigns are created only when due, never handed to Infomaniak two weeks in advance.
  for r in select distinct e.category,m.step from newsletter_sequence_messages m
    join newsletter_sequence_enrollments e on e.id=m.enrollment_id join newsletter_sequences s on s.category=e.category
    where e.state='active' and s.enabled and m.newsletter_id is null and m.due_at<=now()
    order by m.step,e.category loop
    ids:=array(select e.contact_id from newsletter_sequence_enrollments e
      join newsletter_sequence_messages m on m.enrollment_id=e.id
      where e.category=r.category and e.state='active' and m.step=r.step and m.newsletter_id is null and m.due_at<=now()
      and (m.step=0 or exists(select 1 from newsletter_sequence_messages prev join newsletter_deliveries d
        on d.newsletter_id=prev.newsletter_id and d.contact_id=e.contact_id
        where prev.enrollment_id=e.id and prev.step=m.step-1 and d.status='sent' and d.sent_at<=now()-interval '24 hours'))
      order by e.enrolled_at limit 500);
    if cardinality(ids)=0 then continue; end if;
    select created_by into creator from newsletter_sequences where category=r.category;
    if creator is null then continue; end if;
    insert into newsletters(name,subject,html,preheader,created_by)
      select 'Automatique · '||s.category||' · '||case when r.step=0 then 'Bienvenue' else 'Relance '||r.step end,
        s.steps->r.step->>'subject',s.steps->r.step->>'html',coalesce(s.steps->r.step->>'preheader',''),creator
      from newsletter_sequences s where s.category=r.category returning id into batch;
    perform newsletter_enqueue(batch,1,ids,now(),null);
    update newsletter_sequence_messages m set newsletter_id=batch from newsletter_sequence_enrollments e
      where e.id=m.enrollment_id and e.contact_id=any(ids) and m.step=r.step and m.newsletter_id is null;
    total:=total+cardinality(ids);
  end loop;
  return total;
end $$;

-- Wrap the existing provider queue; its opt-outs, locks and uncertain-send safeguards remain in force.
alter function public.newsletter_infomaniak_claim() rename to newsletter_infomaniak_claim_without_sequences;
create function public.newsletter_infomaniak_claim() returns setof newsletters
language plpgsql security definer set search_path=public as $$
begin
  perform newsletter_sequence_tick();
  return query select * from newsletter_infomaniak_claim_without_sequences();
end $$;
alter function public.newsletter_infomaniak_recipients(uuid,uuid) rename to newsletter_infomaniak_recipients_without_sequences;
create function public.newsletter_infomaniak_recipients(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  perform newsletter_infomaniak_recipients_without_sequences(p_id,p_token);
  update newsletter_deliveries d set status='skipped',error=coalesce(newsletter_sequence_stop_reason(d.contact_id),'Séquence arrêtée ou suspendue')
    where d.newsletter_id=p_id and d.status='pending' and exists(
      select 1 from newsletter_sequence_messages m join newsletter_sequence_enrollments e on e.id=m.enrollment_id
      join newsletter_sequences s on s.category=e.category
      where m.newsletter_id=p_id and e.contact_id=d.contact_id and
      (e.state<>'active' or not s.enabled or newsletter_sequence_stop_reason(d.contact_id) is not null));
  return newsletter_infomaniak_recipients_without_sequences(p_id,p_token);
end $$;

create function public.newsletter_sequence_configure(p_category text,p_enabled boolean,p_steps jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare item jsonb;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'Administrateur requis'; end if;
  if jsonb_typeof(p_steps)<>'array' or jsonb_array_length(p_steps)<>6 then raise exception 'Six emails sont requis'; end if;
  for item in select * from jsonb_array_elements(p_steps) loop
    if length(trim(coalesce(item->>'subject','')))=0 or length(item->>'subject')>200 or length(coalesce(item->>'html',''))<100
      or length(item->>'html')>500000 or item->>'html' ~* '<(script|iframe|object|embed|form|input|base)([[:space:]>])|on[a-z]+[[:space:]]*=|javascript[[:space:]]*:' then raise exception 'Objet ou HTML invalide'; end if;
  end loop;
  update newsletter_sequences set enabled=p_enabled,steps=p_steps,created_by=auth.uid(),updated_at=now()
    where category=p_category;
  if not found then raise exception 'Groupe invalide'; end if;
end $$;

create function public.newsletter_sequence_stop(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'Administrateur requis'; end if;
  update newsletter_sequence_enrollments set state='stopped',reason='Arrêt manuel',stopped_at=now(),updated_at=now() where id=p_id and state in ('active','review');
end $$;
revoke all on function newsletter_conversion_reason(text),newsletter_sequence_stop_reason(uuid),newsletter_sequence_enroll_meta(),newsletter_sequence_tick(),newsletter_infomaniak_claim(),newsletter_infomaniak_recipients(uuid,uuid),newsletter_sequence_configure(text,boolean,jsonb),newsletter_sequence_stop(uuid) from public,anon,authenticated;
grant execute on function newsletter_conversion_reason(text),newsletter_sequence_stop_reason(uuid),newsletter_sequence_tick(),newsletter_infomaniak_claim(),newsletter_infomaniak_recipients(uuid,uuid) to service_role;
grant execute on function newsletter_sequence_configure(text,boolean,jsonb),newsletter_sequence_stop(uuid) to authenticated;

-- Existing marketing senders must skip every enrolled contact, including stopped/completed sequences.
create function public.newsletter_sequence_managed_emails(p_emails text[]) returns table(email text)
language sql stable security definer set search_path=public as $$
 select c.email from newsletter_contacts c join newsletter_sequence_enrollments e on e.contact_id=c.id where c.email=any(p_emails);
$$;
revoke all on function newsletter_sequence_managed_emails(text[]) from public,anon,authenticated;
grant execute on function newsletter_sequence_managed_emails(text[]) to service_role;
