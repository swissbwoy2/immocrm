-- Campaign-specific welcome before the existing six-email sequence. No historical enrollment.
create table public.newsletter_sequence_welcomes (
  campaign_id text primary key,
  name text not null,
  subject text not null,
  html text not null,
  preheader text not null default '',
  enabled boolean not null default false,
  normal_delay_hours integer not null default 24 check(normal_delay_hours between 1 and 168),
  starts_at timestamptz not null default now()
);
alter table newsletter_sequence_welcomes enable row level security;
create policy welcome_admin_read on newsletter_sequence_welcomes for select to authenticated using(has_role(auth.uid(),'admin'));
revoke all on newsletter_sequence_welcomes from anon,authenticated;
grant select on newsletter_sequence_welcomes to authenticated;
grant all on newsletter_sequence_welcomes to service_role;
alter table newsletter_sequence_enrollments add column welcome_campaign_id text references newsletter_sequence_welcomes(campaign_id);
alter table newsletter_sequence_messages drop constraint newsletter_sequence_messages_step_check;
alter table newsletter_sequence_messages add constraint newsletter_sequence_messages_step_check check(step between -1 and 5);

create or replace function public.newsletter_sequence_enroll_meta() returns trigger
language plpgsql security definer set search_path=public as $$
declare cl jsonb; cats text[]; category_key text; c newsletter_contacts; e uuid; cfg newsletter_sequences; why text; welcome newsletter_sequence_welcomes;
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
  -- Campaign ID is authoritative: a shared form or a missing campaign name cannot misroute an email.
  if cfg.category='renter' then
    select * into welcome from newsletter_sequence_welcomes w where w.campaign_id=new.campaign_id and w.enabled
      and (new.lead_created_time_meta is null or new.lead_created_time_meta>=w.starts_at);
  end if;
  why:=newsletter_sequence_stop_reason(c.id);
  insert into newsletter_sequence_enrollments(contact_id,meta_lead_id,form_id,category,state,reason,welcome_campaign_id)
  values(c.id,new.id,new.form_id,cfg.category,
    case when why is not null then 'stopped' when cfg.enabled is true then 'active' else 'review' end,
    coalesce(why,case when cfg.enabled is not true then 'Formulaire ou séquence à configurer' end),welcome.campaign_id)
  on conflict(contact_id) do nothing returning id into e;
  if e is not null and why is null and cfg.enabled is true then
    insert into newsletter_sequence_messages(enrollment_id,step,due_at)
    select e,i-1,now()+make_interval(days=>day,hours=>coalesce(welcome.normal_delay_hours,0)) from unnest(array[0,1,3,7,10,14]) with ordinality d(day,i);
    if welcome.campaign_id is not null then
      insert into newsletter_sequence_messages(enrollment_id,step,due_at) values(e,-1,now());
    end if;
  end if;
  return new;
end $$;
create or replace function public.newsletter_sequence_tick() returns integer
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
  for r in select distinct e.category,m.step,case when m.step=-1 then e.welcome_campaign_id end welcome_id from newsletter_sequence_messages m
    join newsletter_sequence_enrollments e on e.id=m.enrollment_id join newsletter_sequences s on s.category=e.category
    where e.state='active' and s.enabled and m.newsletter_id is null and m.due_at<=now()
    order by m.step,e.category loop
    ids:=array(select e.contact_id from newsletter_sequence_enrollments e
      join newsletter_sequence_messages m on m.enrollment_id=e.id
      where e.category=r.category and e.state='active' and m.step=r.step and m.newsletter_id is null and m.due_at<=now()
      and (m.step<>-1 or e.welcome_campaign_id=r.welcome_id)
      and (m.step<>-1 or exists(select 1 from newsletter_sequence_welcomes w where w.campaign_id=e.welcome_campaign_id and w.enabled))
      and (m.step=-1 or (m.step=0 and e.welcome_campaign_id is null) or exists(select 1 from newsletter_sequence_messages prev join newsletter_deliveries d
        on d.newsletter_id=prev.newsletter_id and d.contact_id=e.contact_id
        where prev.enrollment_id=e.id and prev.step=m.step-1 and d.status='sent' and d.sent_at<=now()-make_interval(hours=>case when m.step=0 then (select normal_delay_hours from newsletter_sequence_welcomes where campaign_id=e.welcome_campaign_id) else 24 end)))
      order by e.enrolled_at limit 500);
    if cardinality(ids)=0 then continue; end if;
    select created_by into creator from newsletter_sequences where category=r.category;
    if creator is null then continue; end if;
    if r.step=-1 then
      insert into newsletters(name,subject,html,preheader,created_by)
        select 'Automatique · '||w.name||' · Invitation visite',w.subject,w.html,w.preheader,creator
        from newsletter_sequence_welcomes w where w.campaign_id=r.welcome_id and w.enabled returning id into batch;
    else
    insert into newsletters(name,subject,html,preheader,created_by)
      select 'Automatique · '||s.category||' · '||case when r.step=0 then 'Bienvenue' else 'Relance '||r.step end,
        s.steps->r.step->>'subject',s.steps->r.step->>'html',coalesce(s.steps->r.step->>'preheader',''),creator
      from newsletter_sequences s where s.category=r.category returning id into batch;
    end if;
    if batch is null then continue; end if;
    perform newsletter_enqueue(batch,1,ids,now(),null);
    update newsletter_sequence_messages m set newsletter_id=batch from newsletter_sequence_enrollments e
      where e.id=m.enrollment_id and e.contact_id=any(ids) and m.step=r.step and m.newsletter_id is null;
    total:=total+cardinality(ids);
  end loop;
  return total;
end $$;

create or replace function public.newsletter_infomaniak_recipients(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  perform newsletter_infomaniak_recipients_without_sequences(p_id,p_token);
  update newsletter_deliveries d set status='skipped',error=coalesce(newsletter_sequence_stop_reason(d.contact_id),'Séquence arrêtée ou suspendue')
    where d.newsletter_id=p_id and d.status='pending' and exists(
      select 1 from newsletter_sequence_messages m join newsletter_sequence_enrollments e on e.id=m.enrollment_id
      join newsletter_sequences s on s.category=e.category
      where m.newsletter_id=p_id and e.contact_id=d.contact_id and
      (e.state<>'active' or not s.enabled or newsletter_sequence_stop_reason(d.contact_id) is not null or (m.step=-1 and not exists(select 1 from newsletter_sequence_welcomes w where w.campaign_id=e.welcome_campaign_id and w.enabled))));
  return newsletter_infomaniak_recipients_without_sequences(p_id,p_token);
end $$;

