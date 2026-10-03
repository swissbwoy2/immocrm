-- Reporting is admin-only. Public collectors accept opaque IDs, never an email address.
begin;
alter table public.lead_email_logs
  add column tracking_enabled boolean not null default false,
  add column tracking_note text,
  add column tracking_provider text not null default 'resend',
  add column delivery_confirmed_at timestamptz,
  add column delivery_status text,
  add column delivery_status_at timestamptz,
  add column notification_id uuid,
  add column tracking_key text;
create unique index lead_email_tracking_key on public.lead_email_logs(tracking_key) where tracking_key is not null;
create index lead_email_provider_message on public.lead_email_logs(provider_message_id);
-- Legacy openings exist, but old delivered_at was inferred by the pixel: do not treat it as a delivery receipt.
update public.lead_email_logs set tracking_enabled=true where coalesce(opens_count,0)>0 or coalesce(clicks_count,0)>0;
alter table public.notifications add column read_at timestamptz;
alter table public.sent_emails add column tracking_log_id uuid;
alter table public.newsletters add column tracking_enabled boolean not null default false,
  add column tracking_synced_at timestamptz, add column tracking_error text;
alter table public.newsletter_deliveries add column tracking_outcomes text[] not null default '{}', add column opens_count integer,
  add column clicks_count integer, add column delivered_at timestamptz,
  add column opened_at timestamptz, add column last_opened_at timestamptz,
  add column clicked_at timestamptz, add column last_clicked_at timestamptz,
  add column bounced_at timestamptz, add column complained_at timestamptz,
  add column unsubscribed_at timestamptz, add column tracking_observed_at timestamptz;
create table public.communication_events (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  event_type text not null check(event_type in ('opened','clicked','read','delivered','bounced','complained','unsubscribed','delayed','failed')),
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  url text, provider text not null, external_id text unique,
  time_basis text not null default 'event' check(time_basis in ('event','observed'))
);
create index communication_events_source_time on public.communication_events(source_id,occurred_at desc);
alter table public.communication_events enable row level security;
create policy communication_events_service on public.communication_events for all to service_role using(true) with check(true);
create policy communication_events_admin on public.communication_events for select to authenticated using(public.has_role(auth.uid(),'admin'));
create table public.communication_links (
  id uuid primary key default gen_random_uuid(), log_id uuid not null references public.lead_email_logs(id) on delete cascade,
  url text not null check(length(url)<=8192), unique(log_id,url)
);
alter table public.communication_links enable row level security;
create policy communication_links_service on public.communication_links for all to service_role using(true) with check(true);

create or replace function public.track_email_open(_log_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.lead_email_logs set opens_count=coalesce(opens_count,0)+1,
   opened_at=coalesce(opened_at,now()),last_opened_at=now(),tracking_enabled=true where id=_log_id;
 if found then insert into public.communication_events(source_id,event_type,provider) values('email:'||_log_id,'opened','pixel'); end if;
end $$;
create or replace function public.track_email_click(_log_id uuid,_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.lead_email_logs set clicks_count=coalesce(clicks_count,0)+1,
   clicked_at=coalesce(clicked_at,now()),last_clicked_at=now(),last_click_url=_url,tracking_enabled=true where id=_log_id;
 if found then insert into public.communication_events(source_id,event_type,url,provider) values('email:'||_log_id,'clicked',split_part(split_part(_url,'?',1),'#',1),'redirect'); end if;
end $$;
revoke all on function public.track_email_open(uuid),public.track_email_click(uuid,text) from public,anon,authenticated;
grant execute on function public.track_email_open(uuid),public.track_email_click(uuid,text) to service_role;

create function public.communication_notification_read() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then new.read_at=null;
 else
  new.read_at=old.read_at;
  if new.read and not coalesce(old.read,false) then
   new.read_at=coalesce(old.read_at,now());
   insert into public.communication_events(source_id,event_type,provider) values('notification:'||new.id,'read','application');
  end if;
 end if;
 return new;
end $$;
create trigger communication_notification_read before insert or update on public.notifications for each row execute function public.communication_notification_read();
create function public.communication_notification_click(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare dest text;
begin
 select link into dest from public.notifications where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Notification introuvable'; end if;
 update public.notifications set read=true where id=p_id;
 insert into public.communication_events(source_id,event_type,url,provider) values('notification:'||p_id,'clicked',split_part(split_part(dest,'?',1),'#',1),'application');
end $$;
revoke all on function public.communication_notification_click(uuid) from public,anon;
grant execute on function public.communication_notification_click(uuid) to authenticated;

create view public.communication_tracking as
 select 'email:'||l.id as id,'email'::text as channel,l.recipient_email as recipient,l.subject,
 coalesce(l.campaign_key,'Email automatique') as campaign,l.tracking_provider as provider,
 coalesce(l.delivery_status,l.status) as status,coalesce(l.sent_at,l.created_at) as created_at,
 case when l.status='sent' then l.sent_at end as sent_at,l.delivery_confirmed_at as delivered_at,
 l.opened_at,l.last_opened_at,case when l.tracking_enabled then coalesce(l.opens_count,0) end as opens_count,
 l.clicked_at,l.last_clicked_at,case when l.tracking_enabled then coalesce(l.clicks_count,0) end as clicks_count,
 null::timestamptz as read_at,false as is_read,l.bounced_at,l.complained_at,null::timestamptz as unsubscribed_at,
 l.tracking_enabled,l.tracking_note,l.error_message as error,null::timestamptz as synced_at
 from public.lead_email_logs l where not coalesce(l.test_send,false)
 union all
 select 'newsletter:'||d.id,'newsletter',d.email,n.subject,n.name,n.provider,case when 'complained'=any(d.tracking_outcomes) then 'complained' when 'bounced'=any(d.tracking_outcomes) then 'bounced' when 'unsubscribed'=any(d.tracking_outcomes) then 'unsubscribed' when 'delayed'=any(d.tracking_outcomes) then 'delayed' else d.status end,
 coalesce(d.sent_at,n.scheduled_at,n.created_at),d.sent_at,d.delivered_at,d.opened_at,d.last_opened_at,d.opens_count,
 d.clicked_at,d.last_clicked_at,d.clicks_count,null,false,d.bounced_at,d.complained_at,d.unsubscribed_at,
 n.tracking_enabled,case when not n.tracking_enabled then 'Suivi désactivé lors de cet envoi' end,d.error,n.tracking_synced_at
 from public.newsletter_deliveries d join public.newsletters n on n.id=d.newsletter_id
 union all
 select 'notification:'||n.id,'notification',coalesce(p.email,n.user_id::text),n.title,n.type,'application',
 case when n.read then 'read' else 'available' end,n.created_at,null,null,null,null,null,
 e.first_click,e.last_click,e.clicks,n.read_at,n.read,null,null,null,true,
 case when n.read and n.read_at is null then 'Lecture historique : date indisponible' end,null,null
 from public.notifications n left join public.profiles p on p.id=n.user_id
 left join lateral (select min(occurred_at) first_click,max(occurred_at) last_click,count(*)::int clicks
 from public.communication_events where source_id='notification:'||n.id and event_type='clicked') e on true
 union all
 select 'smtp:'||s.id,'email',s.recipient_email,s.subject,'Email manuel','smtp',s.status,s.sent_at,
 case when s.status='sent' then s.sent_at end,null,null,null,null,null,null,null,null,false,null,null,null,false,
 'Historique SMTP : réception et interactions non mesurées',s.error_message,null
 from public.sent_emails s where s.tracking_log_id is null
 union all
 select 'managed:'||l.id,'email',l.recipient_email,l.template_name,l.template_name,'lovable',l.status,l.created_at,
 case when l.status='sent' then l.created_at end,null,null,null,null,null,null,null,null,false,
 case when l.status='bounced' then l.created_at end,case when l.status='complained' then l.created_at end,null,false,
 'Journal historique : interactions non mesurées',l.error_message,null
 from public.email_send_log l where not exists(select 1 from public.lead_email_logs t where
  (l.message_id is not null and t.provider_message_id=l.message_id) or
  (t.tracking_provider='lovable' and t.recipient_email=l.recipient_email and t.campaign_key=l.template_name and abs(extract(epoch from t.created_at-l.created_at))<60));
revoke all on public.communication_tracking from public,anon,authenticated;
grant select on public.communication_tracking to service_role;

create function public.communication_report(p_days integer default 30,p_channel text default '',p_search text default '',p_status text default '',p_campaign text default '',p_page integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
with filtered as materialized (
 select * from public.communication_tracking where created_at >= now()-make_interval(days=>least(3660,greatest(1,p_days)))
 and (p_channel='' or channel=p_channel)
 and (p_search='' or position(lower(left(p_search,200)) in lower(recipient||' '||coalesce(subject,'')))>0)
 and (p_campaign='' or campaign=p_campaign)
 and (p_status='' or (p_status='opened' and coalesce(opens_count,0)>0) or (p_status='clicked' and coalesce(clicks_count,0)>0)
 or (p_status='read' and is_read) or (p_status='delivered' and delivered_at is not null)
 or (p_status='bounced' and (bounced_at is not null or status='bounced')) or (p_status='failed' and (status in ('failed','attention','dlq','bounced') or bounced_at is not null))
 or (p_status='sent' and sent_at is not null) or (p_status='untracked' and not tracking_enabled))
), page as (select * from filtered order by created_at desc,id limit 50 offset greatest(0,least(p_page,20000))*50)
select jsonb_build_object('rows',coalesce((select jsonb_agg(page) from page),'[]'::jsonb),
 'summary',(select jsonb_build_object('total',count(*),'sent',count(*) filter(where sent_at is not null),
 'delivered',count(*) filter(where delivered_at is not null),'opened',count(*) filter(where coalesce(opens_count,0)>0),
 'clicked',count(*) filter(where coalesce(clicks_count,0)>0),'read',count(*) filter(where is_read),
 'failed',count(*) filter(where status in ('failed','attention','dlq','bounced') or bounced_at is not null),
 'tracked_emails',count(*) filter(where channel<>'notification' and tracking_enabled and sent_at is not null),
 'opened_emails',count(*) filter(where channel<>'notification' and tracking_enabled and sent_at is not null and coalesce(opens_count,0)>0),
 'clicked_emails',count(*) filter(where channel<>'notification' and tracking_enabled and sent_at is not null and coalesce(clicks_count,0)>0)) from filtered),
 'campaigns',coalesce((select jsonb_agg(campaign order by campaign) from (select distinct campaign from public.communication_tracking where created_at>=now()-make_interval(days=>least(3660,greatest(1,p_days)))) c),'[]'::jsonb));
$$;
revoke all on function public.communication_report(integer,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.communication_report(integer,text,text,text,text,integer) to service_role;
commit;
