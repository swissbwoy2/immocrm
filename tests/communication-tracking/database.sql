-- Run inside a transaction after the migrations, then ROLLBACK. No email is sent.
do $$
declare logid uuid:=gen_random_uuid(); noteid uuid:=gen_random_uuid(); ownerid uuid; otherid uuid; report jsonb; n integer;
begin
 select id into ownerid from public.profiles limit 1;
 select id into otherid from public.profiles where id<>ownerid limit 1;
 insert into public.lead_email_logs(id,recipient_email,subject,campaign_key,status,sent_at,tracking_enabled) values(logid,'tracking-audit@example.test','Tracking audit','Tracking audit','pending',null,true);
 perform public.communication_receipt('tracking-audit-receipt','resend','tracking-audit-message',null,'delivered',now()-interval '10 seconds');
 update public.lead_email_logs set provider_message_id='tracking-audit-message',status='sent',sent_at=now()-interval '1 minute' where id=logid;
 perform public.communication_receipt('tracking-audit-receipt','resend','tracking-audit-message',null,'delivered',now()-interval '10 seconds');
 select count(*) into n from public.communication_events where source_id='email:'||logid and event_type='delivered';
 if n<>1 then raise exception 'Receipt is not idempotent / early receipt was lost'; end if;
 perform public.track_email_click(logid,'https://logisorama.ch/login?private=secret');
 if (select opened_at from public.lead_email_logs where id=logid) is not null then raise exception 'Click fabricated an opening'; end if;
 if (select url from public.communication_events where source_id='email:'||logid and event_type='clicked') like '%secret%' then raise exception 'Sensitive URL was retained in reporting'; end if;
 perform public.track_email_open(logid);
 perform public.track_email_open(logid);
 if (select opens_count from public.lead_email_logs where id=logid)<>2 then raise exception 'Open counter lost'; end if;
 report=public.communication_report(30,'email','tracking-audit@example.test','','',0);
 if (report->'summary'->>'total')::int<>1 or (report->'summary'->>'opened')::int<>1 or (report->'summary'->>'clicked')::int<>1 then raise exception 'Filtered totals wrong'; end if;
 if has_function_privilege('anon','public.communication_report(integer,text,text,text,text,integer)','execute') then raise exception 'Public report access'; end if;
 if has_function_privilege('authenticated','public.track_email_open(uuid)','execute') then raise exception 'Direct tracking write exposed'; end if;
 if has_table_privilege('authenticated','public.communication_tracking','select') then raise exception 'Reporting view exposed'; end if;
 insert into public.notifications(id,user_id,type,title,read) values(noteid,ownerid,'tracking_audit','Tracking audit',false);
 perform set_config('request.jwt.claim.sub',otherid::text,true);
 begin
  perform public.communication_notification_click(noteid);
  raise exception 'Cross-user click allowed';
 exception when others then
  if SQLERRM='Cross-user click allowed' then raise; end if;
 end;
 perform set_config('request.jwt.claim.sub',ownerid::text,true);
 perform public.communication_notification_click(noteid);
 if (select read_at from public.notifications where id=noteid) is null then raise exception 'Read timestamp missing'; end if;
 select count(*) into n from public.communication_events where source_id='notification:'||noteid;
 if n<>2 then raise exception 'Missing read or click event'; end if;
 update public.notifications set read=true where id=noteid;
 select count(*) into n from public.communication_events where source_id='notification:'||noteid and event_type='read';
 if n<>1 then raise exception 'Read event repeated'; end if;
end $$;
select 'All communication database assertions passed' as result;
