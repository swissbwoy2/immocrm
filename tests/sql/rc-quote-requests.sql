-- Run inside a transaction after the migration. Roll back: no test enquiry persists.
do $$
declare uid uuid; other_uid uuid; rid uuid; again uuid; blocked boolean; k uuid:=gen_random_uuid();
begin
  select user_id into uid from public.user_roles where role='candidat' and not public.has_role(user_id,'admin') limit 1;
  select user_id into other_uid from public.user_roles where role='candidat' and user_id<>uid limit 1;
  if uid is null or other_uid is null then raise exception 'Two existing candidate accounts required'; end if;
  perform set_config('test.rc_uid',uid::text,true);
  perform set_config('test.rc_other',other_uid::text,true);
  perform set_config('request.jwt.claim.sub','',true);
  blocked:=false;
  begin
    perform public.request_rc_quote(k,'Test','RC','Rue test 1, 1000 Lausanne','test@example.invalid','+41790000000',2,'1990-01-01','Suisse',true);
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Anonymous request accepted'; end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  blocked:=false;
  begin
    perform public.request_rc_quote(k,'Test','RC','Rue test 1, 1000 Lausanne','test@example.invalid','+41790000000',2,'1990-01-01','Suisse',false);
  exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Missing consent accepted'; end if;
  blocked:=false;
  begin
    perform public.request_rc_quote(k,'Test','RC','Rue test 1, 1000 Lausanne','test@example.invalid','+41790000000',2,current_date+1,'Suisse',true);
  exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Future birth date accepted'; end if;
  blocked:=false;
  begin
    perform public.request_rc_quote(k,'Test','RC','Rue test 1, 1000 Lausanne','invalid-email','+41790000000',0,'1990-01-01','Suisse',true);
  exception when check_violation then blocked:=true; end;
  if not blocked then raise exception 'Invalid fields accepted'; end if;
  rid:=public.request_rc_quote(k,'Test','RC','Rue test 1, 1000 Lausanne','test@example.invalid','+41790000000',2,'1990-01-01','Suisse',true);
  again:=public.request_rc_quote(k,'Test','RC','Rue test 1, 1000 Lausanne','test@example.invalid','+41790000000',2,'1990-01-01','Suisse',true);
  if again<>rid then raise exception 'Retry duplicated the enquiry'; end if;
  again:=public.request_rc_quote(gen_random_uuid(),'Test','RC','Rue test 1, 1000 Lausanne','test@example.invalid','+41790000000',2,'1990-01-01','Suisse',true);
  if again<>rid then raise exception 'Second tab duplicated open enquiry'; end if;
  perform set_config('test.rc_id',rid::text,true);
  blocked:=false;
  begin perform public.admin_set_rc_quote_status(rid,'closed'); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Candidate changed admin status'; end if;
end $$;
set local role authenticated;
do $$
declare visible integer; blocked boolean:=false;
begin
  select count(*) into visible from public.rc_quote_requests where id=current_setting('test.rc_id')::uuid;
  if visible<>1 then raise exception 'Owner cannot read request'; end if;
  perform set_config('request.jwt.claim.sub',current_setting('test.rc_other'),true);
  select count(*) into visible from public.rc_quote_requests where id=current_setting('test.rc_id')::uuid;
  if visible<>0 then raise exception 'Other account can read personal data'; end if;
  begin delete from public.rc_quote_requests where id=current_setting('test.rc_id')::uuid;
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Direct write was allowed'; end if;
end $$;
reset role;
do $$
declare admin_id uuid;
begin
  select user_id into admin_id from public.user_roles where role='admin' limit 1;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.admin_set_rc_quote_status(current_setting('test.rc_id')::uuid,'in_progress');
  if not exists(select 1 from public.rc_quote_requests where id=current_setting('test.rc_id')::uuid and status='in_progress') then raise exception 'Admin status not saved'; end if;
end $$;
select 'RC requests: validation, consent, retry, ownership and admin workflow passed' as result;
