begin;
create table public.communication_sync_state(id text primary key,cursor text,since timestamptz,until timestamptz,last_synced_at timestamptz,error text);
alter table public.communication_sync_state enable row level security;
create policy communication_sync_service on public.communication_sync_state for all to service_role using(true) with check(true);
create function public.communication_newsletter_activity(p_campaign uuid,p_rows jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r record; d public.newsletter_deliveries;
begin
 for r in select * from jsonb_to_recordset(p_rows) as x(email text,open_count integer,click_count integer) loop
  if r.open_count<0 or r.click_count<0 then raise exception 'Compteur invalide'; end if;
  select * into d from public.newsletter_deliveries where newsletter_id=p_campaign and lower(email)=lower(r.email) for update;
  if not found then continue; end if;
  if r.open_count>coalesce(d.opens_count,0) then
   insert into public.communication_events(source_id,event_type,provider,time_basis) values('newsletter:'||d.id,'opened','infomaniak','observed');
  end if;
  if r.click_count>coalesce(d.clicks_count,0) then
   insert into public.communication_events(source_id,event_type,provider,time_basis) values('newsletter:'||d.id,'clicked','infomaniak','observed');
  end if;
  update public.newsletter_deliveries set opens_count=greatest(opens_count,r.open_count),clicks_count=greatest(clicks_count,r.click_count),tracking_observed_at=now() where id=d.id;
 end loop;
end $$;
revoke all on function public.communication_newsletter_activity(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.communication_newsletter_activity(uuid,jsonb) to service_role;
create function public.communication_newsletter_outcomes(p_campaign uuid,p_type text,p_emails text[]) returns void language plpgsql security definer set search_path='' as $$
declare d record;
begin
 if p_type not in ('bounced','complained','unsubscribed','delayed') then raise exception 'Type invalide'; end if;
 for d in update public.newsletter_deliveries set tracking_outcomes=array_append(tracking_outcomes,p_type)
 where newsletter_id=p_campaign and lower(email)=any(p_emails) and not p_type=any(tracking_outcomes) returning id loop
  insert into public.communication_events(source_id,event_type,provider,time_basis) values('newsletter:'||d.id,p_type,'infomaniak','observed');
 end loop;
end $$;
revoke all on function public.communication_newsletter_outcomes(uuid,text,text[]) from public,anon,authenticated;
grant execute on function public.communication_newsletter_outcomes(uuid,text,text[]) to service_role;
select cron.schedule('communication-tracking-sync','*/10 * * * *',$job$
 select net.http_post(url:='https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/communication-sync',headers:=private.newsletter_dispatch_headers(),body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$);
commit;
