-- Future inbox inquiries only. The automation is enabled after deployment and verification.
create table public.portal_visit_automation (
 mailbox text primary key check(mailbox='info@immo-rama.ch'), enabled boolean not null default false,
 starts_at timestamptz not null default now(), last_checked_at timestamptz, last_error text
);
insert into portal_visit_automation(mailbox) values('info@immo-rama.ch');
create table public.portal_visit_aliases (
 source text not null, reference text not null, annonce_id uuid not null references annonces_publiques(id),
 primary key(source,reference)
);
insert into portal_visit_aliases values('homegate.ch','4003515383','1338e6b7-2014-47d0-818a-35122b2a753b');
create table public.portal_visit_requests (
 id uuid primary key default gen_random_uuid(), received_email_id uuid not null unique references received_emails(id),
 source text not null, email text, annonce_id uuid references annonces_publiques(id),
 status text not null check(status in ('review','queued','skipped')), reason text,
 newsletter_id uuid references newsletters(id), created_at timestamptz not null default now()
);
create index portal_visit_requests_recipient on portal_visit_requests(email,annonce_id,created_at desc);
alter table newsletter_sequence_enrollments alter column meta_lead_id drop not null;
alter table newsletter_sequence_enrollments add column received_email_id uuid references received_emails(id);
alter table newsletter_sequence_enrollments add constraint newsletter_enrollment_origin check(meta_lead_id is not null or received_email_id is not null);
do $$declare t text; begin
 foreach t in array array['portal_visit_automation','portal_visit_aliases','portal_visit_requests'] loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy portal_admin_read on %I for select to authenticated using(has_role(auth.uid(),''admin''))',t);
  execute format('revoke all on %I from anon,authenticated',t);
  execute format('grant select on %I to authenticated',t);
  execute format('grant all on %I to service_role',t);
 end loop;
end $$;
create function public.portal_visit_pending() returns setof received_emails
language sql security definer set search_path=public as $$
 select e.* from received_emails e join imap_configurations i on i.user_id=e.user_id
 join portal_visit_automation a on lower(i.imap_user)=a.mailbox
 where a.enabled and i.is_active and lower(e.to_email)=a.mailbox and e.received_at>=a.starts_at and e.created_at>=a.starts_at
 and lower(e.from_email) in ('mail@immobilier.ch','interested@homegate.ch','interested@immoscout24.ch')
 and (lower(e.from_email)<>'mail@immobilier.ch' or e.subject ilike '%demande de contact%')
 and not exists(select 1 from portal_visit_requests r where r.received_email_id=e.id)
 order by e.received_at limit 100;
$$;
create function public.portal_visit_process(p_message uuid,p_source text,p_email text,p_first text,p_last text,p_annonce uuid,p_reason text,p_subject text,p_html text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare cfg portal_visit_automation; msg received_emails; listing annonces_publiques; c newsletter_contacts;
 seq newsletter_sequences; why text; batch uuid; enrollment uuid; welcome_key text; existing portal_visit_requests;
begin
 perform pg_advisory_xact_lock(741006041901::bigint);
 select * into cfg from portal_visit_automation where mailbox='info@immo-rama.ch';
 if cfg.enabled is not true then return jsonb_build_object('status','disabled'); end if;
 select * into existing from portal_visit_requests where received_email_id=p_message;
 if existing.id is not null then return to_jsonb(existing); end if;
 select * into msg from received_emails where id=p_message;
 if msg.id is null or lower(msg.to_email)<>cfg.mailbox or msg.received_at<cfg.starts_at or msg.created_at<cfg.starts_at
 or lower(msg.from_email) not in ('mail@immobilier.ch','interested@homegate.ch','interested@immoscout24.ch')
 or not exists(select 1 from imap_configurations i where i.user_id=msg.user_id and lower(i.imap_user)=cfg.mailbox and i.is_active) then
  raise exception 'Message hors périmètre';
 end if;
 select * into listing from annonces_publiques where id=p_annonce and statut='publie' and (date_expiration is null or date_expiration>now());
 if nullif(p_reason,'') is not null or listing.id is null or coalesce(p_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  insert into portal_visit_requests(received_email_id,source,email,annonce_id,status,reason)
   values(p_message,p_source,p_email,listing.id,'review',coalesce(nullif(p_reason,''),'Contact ou annonce à vérifier')) returning * into existing;
  return to_jsonb(existing);
 end if;
 p_email:=lower(trim(p_email));
 if p_email ~ '@(immo-rama\.ch|logisorama\.ch|immobilier\.ch|homegate\.ch|immoscout24\.ch)$' then raise exception 'Adresse agence exclue'; end if;
 if p_html not like '%https://logisorama.ch/annonces/'||listing.slug||'%' then raise exception 'Lien annonce manquant'; end if;
 insert into newsletter_contacts(email,first_name,last_name,categories,source)
 values(p_email,coalesce(p_first,''),coalesce(p_last,''),array[case when listing.type_transaction='vente' then 'buyer' else 'renter' end],'portails_location_email_auto')
 on conflict(email) do update set updated_at=now(),
 categories=case when newsletter_contacts.classification_manual then newsletter_contacts.categories else array(select distinct unnest(newsletter_contacts.categories||excluded.categories)) end
 returning * into c;
 insert into newsletter_contact_answers(contact_id,source,answers) values(c.id,'email:'||p_message,
 jsonb_build_object('Origine',p_source,'Reçu le',msg.received_at,'Objet',msg.subject,'Bien',listing.titre,'Annonce','https://logisorama.ch/annonces/'||listing.slug)) on conflict do nothing;
 why:=newsletter_sequence_stop_reason(c.id);
 welcome_key:=case when listing.id='1338e6b7-2014-47d0-818a-35122b2a753b' then '120248622162110217' else 'portal:'||listing.id end;
 if why is null and (exists(select 1 from portal_visit_requests r where r.email=p_email and r.annonce_id=listing.id and r.status='queued' and r.created_at>now()-interval '24 hours')
 or exists(select 1 from newsletter_sequence_enrollments e join newsletter_sequence_messages m on m.enrollment_id=e.id
 where e.contact_id=c.id and e.welcome_campaign_id=welcome_key and m.step=-1 and m.due_at>now()-interval '24 hours')) then
  why:='Invitation pour ce bien déjà traitée dans les dernières 24 heures';
 end if;
 if why is not null then
  insert into portal_visit_requests(received_email_id,source,email,annonce_id,status,reason)
   values(p_message,p_source,p_email,listing.id,'skipped',why) returning * into existing;
  return to_jsonb(existing);
 end if;
 select * into seq from newsletter_sequences where category=case when listing.type_transaction='vente' then 'buyer' else 'renter' end;
 if seq.created_by is null then raise exception 'Expéditeur automatique non configuré'; end if;
 insert into newsletter_sequence_welcomes(campaign_id,name,subject,html,enabled,normal_delay_hours)
 values(welcome_key,listing.titre,p_subject,p_html,true,24) on conflict(campaign_id) do nothing;
 -- The existing Druey template remains authoritative, shared with Meta.
 insert into newsletters(name,subject,html,preheader,created_by)
 select 'Automatique · Demande de visite · '||listing.titre,w.subject,w.html,w.preheader,seq.created_by
 from newsletter_sequence_welcomes w where w.campaign_id=welcome_key and w.enabled returning id into batch;
 if batch is null then
  insert into portal_visit_requests(received_email_id,source,email,annonce_id,status,reason) values(p_message,p_source,p_email,listing.id,'review','Modèle de visite suspendu') returning * into existing;
  return to_jsonb(existing);
 end if;
 perform newsletter_enqueue(batch,1,array[c.id],now(),null);
 insert into newsletter_sequence_enrollments(contact_id,received_email_id,form_id,category,state,reason,welcome_campaign_id)
 values(c.id,p_message,'Email · '||p_source,seq.category,case when seq.enabled then 'active' else 'review' end,
 case when not seq.enabled then 'Séquence de suivi suspendue' end,welcome_key)
 on conflict(contact_id) do nothing returning id into enrollment;
 if enrollment is not null then
  insert into newsletter_sequence_messages(enrollment_id,step,due_at,newsletter_id) values(enrollment,-1,now(),batch);
  insert into newsletter_sequence_messages(enrollment_id,step,due_at)
  select enrollment,i-1,now()+make_interval(days=>day,hours=>24) from unnest(array[0,1,3,7,10,14]) with ordinality d(day,i);
 end if;
 insert into portal_visit_requests(received_email_id,source,email,annonce_id,status,newsletter_id,reason)
 values(p_message,p_source,p_email,listing.id,'queued',batch,case when enrollment is null then 'Parcours existant conservé, sans nouvelle séquence' else 'Invitation puis six emails à partir du lendemain' end) returning * into existing;
 return to_jsonb(existing);
end $$;
create function public.portal_visit_configure(p_enabled boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if not has_role(auth.uid(),'admin') then raise exception 'Administrateur requis'; end if;
 update portal_visit_automation set enabled=p_enabled,starts_at=case when p_enabled and not enabled then now() else starts_at end where mailbox='info@immo-rama.ch';
end $$;
revoke all on function portal_visit_pending(),portal_visit_process(uuid,text,text,text,text,uuid,text,text,text),portal_visit_configure(boolean) from public,anon,authenticated;
grant execute on function portal_visit_pending(),portal_visit_process(uuid,text,text,text,text,uuid,text,text,text) to service_role;
grant execute on function portal_visit_configure(boolean) to authenticated,service_role;
-- Poll only the shared portal inbox; the existing all-mailboxes schedule remains unchanged.
select cron.schedule('portal-visit-inbox-every-minute','* * * * *',$cron$
 select net.http_post(url:='https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/sync-all-imap-emails',
 headers:=private.edge_service_headers(),body:='{"source":"portal-visits","mailbox":"info@immo-rama.ch"}'::jsonb);
$cron$);

-- Re-check exclusions and conversion immediately before provider dispatch, including returning contacts.
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
  update newsletter_deliveries d set status='skipped',error=newsletter_sequence_stop_reason(d.contact_id)
    where d.newsletter_id=p_id and d.status='pending' and newsletter_sequence_stop_reason(d.contact_id) is not null
    and exists(select 1 from portal_visit_requests r where r.newsletter_id=p_id);
  return newsletter_infomaniak_recipients_without_sequences(p_id,p_token);
end $$;

