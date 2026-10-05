-- One in-app alert per candidate and slot, including cancelled previous visits.
-- Alerts contain no time/date. Existing push and newsletter transports are reused.
create unique index if not exists notifications_new_slot_once
on public.notifications(user_id, (metadata->>'creneau_id'))
where type='annonce_new_slot';

create table if not exists public.annonce_slot_notification_runs (
  id uuid primary key default gen_random_uuid(),
  creneau_id uuid not null references public.annonce_creneaux(id) on delete cascade,
  created_at timestamptz not null default now(),
  notification_count integer not null,
  newsletter_id uuid references public.newsletters(id),
  push_requests jsonb not null default '[]'::jsonb
);
alter table public.annonce_slot_notification_runs enable row level security;
revoke all on public.annonce_slot_notification_runs from anon, authenticated;
grant all on public.annonce_slot_notification_runs to service_role;

create or replace function public.notify_annonce_slot_available(p_creneau uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare
  slot public.annonce_creneaux;
  listing_slug text;
  booked integer;
  inserted_count integer := 0;
  batch record;
  request_id bigint;
  requests jsonb := '[]'::jsonb;
  new_users uuid[] := array[]::uuid[];
  contact_ids uuid[];
  campaign_id uuid;
  email_html text;
  title constant text := 'Un nouveau créneau est disponible !';
  body constant text := 'Réservez votre place rapidement ! Connectez-vous à votre espace pour consulter les créneaux disponibles et réserver votre visite.';
begin
  -- Serializes concurrent activation/manual reconciliation, without taking a booking lock.
  perform pg_advisory_xact_lock(hashtextextended('slot-notice:'||p_creneau::text,0));
  select * into slot from public.annonce_creneaux where id=p_creneau;
  if not found or not slot.actif or slot.date_heure<=now() then return 0; end if;
  select slug into listing_slug from public.annonces_publiques where id=slot.annonce_id;
  select count(*) into booked from public.candidatures_location c
  where c.creneau_id=slot.id and coalesce(c.statut,'') not in ('desiste','refuse');
  if slot.capacite_max is not null and booked>=slot.capacite_max then return 0; end if;

  for batch in
    with audience as (
      select distinct p.id,
        case when exists(select 1 from public.user_roles r where r.user_id=p.id and r.role='candidat')
          then '/candidat/agenda?annonceId='||slot.annonce_id::text
          else '/annonces/'||coalesce(nullif(listing_slug,''),slot.annonce_id::text) end as link
      from public.candidatures_location c join public.profiles p on p.id=c.user_id
      where c.annonce_id=slot.annonce_id and p.anonymise_at is null
        and not coalesce(p.is_demo_account,false)
        -- All accounts associated with this listing; cancellations remain included.
        and not exists(select 1 from public.candidatures_location reservation
          where reservation.user_id=p.id and reservation.creneau_id=slot.id
            and not coalesce(reservation.annulee,false)
            and coalesce(reservation.statut,'') not in ('desiste','refuse','refusee'))
    ), added as (
      insert into public.notifications(user_id,type,title,message,link,metadata)
      select a.id,'annonce_new_slot',title,body,a.link,
        jsonb_build_object('creneau_id',slot.id,'annonce_id',slot.annonce_id,'channel','in_app','automated',true)
      from audience a
      on conflict (user_id,(metadata->>'creneau_id')) where type='annonce_new_slot' do nothing
      returning user_id,link
    ) select link,array_agg(user_id) users,count(*) n from added group by link
  loop
    inserted_count := inserted_count + batch.n;
    new_users := new_users || batch.users;
    begin
      request_id := net.http_post(
        url:='https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-push-notification',
        headers:=private.edge_service_headers(),
        body:=jsonb_build_object('user_ids',batch.users,'title',title,'body',body,'link',batch.link,
          'data',jsonb_build_object('type','annonce_new_slot','creneau_id',slot.id::text)),
        timeout_milliseconds:=20000);
      requests := requests || jsonb_build_array(jsonb_build_object('request_id',request_id,'recipients',batch.n));
    exception when others then
      -- A device push failure must never remove a persisted in-app notification.
      requests := requests || jsonb_build_array(jsonb_build_object('error','push_enqueue_failed','recipients',batch.n));
    end;
  end loop;

  if inserted_count>0 then
    -- Contact creation never reactivates an existing excluded subscriber.
    insert into public.newsletter_contacts(email,first_name,last_name,kind,categories,source)
    select distinct lower(trim(p.email)),p.prenom,p.nom,
      case when exists(select 1 from public.clients c where c.user_id=p.id) then 'client' else 'prospect' end,
      array['visit'],'visites'
    from public.profiles p where p.id=any(new_users)
      and p.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    on conflict(email) do nothing;
    select array_agg(distinct nc.id) into contact_ids
    from public.newsletter_contacts nc join public.profiles p on lower(trim(p.email))=nc.email
    where p.id=any(new_users) and p.notifications_email is distinct from false and not nc.excluded
      and not exists(select 1 from public.email_unsubscribes u where lower(trim(u.email))=nc.email)
      and not exists(select 1 from public.suppressed_emails u where lower(trim(u.email))=nc.email)
      and not exists(select 1 from public.newsletter_contact_suppressions u where u.email=nc.email);
    if cardinality(contact_ids)>0 then
      email_html := $template$<!DOCTYPE html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Un nouveau créneau est disponible !</title>
<style>@media screen and (max-width:520px){.outer{padding:0!important}.pad{padding-left:24px!important;padding-right:24px!important}.heading{font-size:30px!important;line-height:33px!important}.col{display:block!important;width:100%!important;box-sizing:border-box!important}.coltext{padding:24px 0 0!important}.section{padding:28px 24px!important}.brandline{font-size:9px!important;letter-spacing:1px!important}}</style></head>
<body style="margin:0;background:#eef0eb;font-family:Arial,Helvetica,sans-serif;">
<div id="newsletter-preheader" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Réservez votre place rapidement depuis votre espace Logisorama.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef0eb"><tr><td align="center" class="outer" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table id="newsletter" role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:640px;border-top:4px solid #205a43;">
<tr><td class="pad" style="padding:20px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>
<div style="font-size:27px;line-height:30px;font-weight:bold;letter-spacing:-1px;color:#193d2c;">Logisorama</div>
<img src="https://logisorama.ch/email/logo-logisorama.png" width="144" height="40" alt="Logisorama" style="display:block;border:0;margin-top:3px;">
</td><td align="right" class="brandline" style="font-size:10px;line-height:17px;letter-spacing:1.5px;color:#677a6c;">LA NEWSLETTER<br>VOTRE VISITE</td></tr></table>
</td></tr>
<tr><td><a href="{{booking_url}}" target="_blank"><img src="https://logisorama.ch/newsletter/candidature-parcours.jpg" width="640" alt="Votre visite avec Logisorama" style="display:block;border:0;width:100%;height:auto;"></a></td></tr>
<tr><td class="pad" style="padding:28px 36px;">
<h1 class="heading" style="margin:0 0 18px;color:#1c523c;font-size:34px;line-height:39px;">Un nouveau créneau est disponible !</h1>
<p style="font-size:16px;line-height:26px;color:#5c665e;">Bonjour,</p>
<p style="font-size:16px;line-height:26px;color:#5c665e;">Vous avez manifesté votre intérêt pour <strong>{{listing_title}}</strong>. Un nouveau créneau de visite est maintenant disponible.</p>
<p style="font-size:16px;line-height:26px;color:#5c665e;"><strong>Réservez votre place rapidement !</strong> Retrouvez les disponibilités dans votre espace et sélectionnez votre créneau pour confirmer votre réservation.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#205a43" style="border-radius:5px;"><a href="{{booking_url}}" style="display:inline-block;padding:16px 24px;color:white;background:#205a43;border-radius:5px;text-decoration:none;font:bold 16px Arial;">Réserver ma place →</a></td></tr></table>
<p style="font-size:13px;line-height:21px;color:#677a6c;margin-top:22px;">Utilisez votre compte Logisorama habituel. Les places sont attribuées selon les disponibilités au moment de la réservation.</p>
<p style="font-size:16px;line-height:26px;color:#5c665e;">Au plaisir de vous rencontrer !<br>L’équipe Logisorama</p>
</td></tr>
<tr><td align="center" style="padding:26px 24px;color:#7b847a;font-size:12px;line-height:20px;"><strong style="color:#435b47;">Logisorama · Immo-rama</strong><br>Votre recherche de logement, au même endroit.<br><a href="{{unsubscribe_url}}" style="color:#7b847a">Se désinscrire</a></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>$template$;
      email_html := replace(email_html,'{{listing_title}}',
        replace(replace(replace(coalesce((select titre from public.annonces_publiques where id=slot.annonce_id),'ce logement'),'&','&amp;'),'<','&lt;'),'>','&gt;'));
      email_html := replace(email_html,'{{booking_url}}','https://logisorama.ch/login?next=/annonces/'||coalesce(nullif(listing_slug,''),slot.annonce_id::text));
      insert into public.newsletters(name,subject,preheader,html,status,tracking_enabled,created_by)
      values('Nouveau créneau · '||slot.id::text,title,'Réservez votre place rapidement depuis votre espace Logisorama.',email_html,'draft',true,(select user_id from public.user_roles where role='admin' order by user_id limit 1))
      returning id into campaign_id;
      perform public.newsletter_enqueue(campaign_id,1,contact_ids,now(),null);
    end if;
    insert into public.annonce_slot_notification_runs(creneau_id,notification_count,push_requests,newsletter_id)
    values(slot.id,inserted_count,requests,campaign_id);
  end if;

  return inserted_count;
end $$;
revoke all on function public.notify_annonce_slot_available(uuid) from public,anon,authenticated;
grant execute on function public.notify_annonce_slot_available(uuid) to service_role;

create or replace function public.trigger_annonce_slot_available()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    perform public.notify_annonce_slot_available(new.id);
  elsif (not old.actif and new.actif)
     or new.date_heure is distinct from old.date_heure
     or (old.capacite_max is not null and (new.capacite_max is null or new.capacite_max>old.capacite_max)) then
    perform public.notify_annonce_slot_available(new.id);
  end if;
  return new;
end $$;
revoke all on function public.trigger_annonce_slot_available() from public,anon,authenticated;
drop trigger if exists trg_annonce_slot_available on public.annonce_creneaux;
create trigger trg_annonce_slot_available after insert or update of actif,date_heure,capacite_max
on public.annonce_creneaux for each row execute function public.trigger_annonce_slot_available();
