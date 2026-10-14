begin;
-- Apply the RC guest migration first.
set local role anon;
select set_config('request.headers','{"x-forwarded-for":"rc-test-isolated"}',true);
do $test$
declare receipt uuid; before_count integer; denied boolean:=false;
begin
receipt:=public.request_rc_quote_guest('99000000-0000-4000-8000-000000000001','Camille','Test','Rue Test 1, 1000 Lausanne','rc-test@example.invalid','+41790000000',2,'1990-01-01','Suisse',true);
if receipt<>'99000000-0000-4000-8000-000000000001' then raise exception 'receipt'; end if;
perform public.request_rc_quote_guest('99000000-0000-4000-8000-000000000002','Camille','Test','Rue Test 1, 1000 Lausanne','rc-test@example.invalid','+41790000000',2,'1990-01-01','Suisse',true);
begin perform id from public.rc_quote_requests; exception when insufficient_privilege then denied:=true; end;
if not denied then raise exception 'anonymous read allowed'; end if;
denied:=false;
begin perform public.request_rc_quote_guest(gen_random_uuid(),'Camille','Test','Rue Test 1, 1000 Lausanne','rc-test@example.invalid','+41790000000',2,'1990-01-01','Suisse',false); exception when raise_exception then denied:=true; end;
if not denied then raise exception 'consent bypass'; end if;
for i in 1..3 loop perform public.request_rc_quote_guest(gen_random_uuid(),'Camille','Test','Rue Test 1, 1000 Lausanne','rc-test@example.invalid','+41790000000',2,'1990-01-01','Suisse',true); end loop;
if public.request_rc_quote_guest(gen_random_uuid(),'Camille','Test','Rue Test 1, 1000 Lausanne','rc-test@example.invalid','+41790000000',2,'1990-01-01','Suisse',true) is not null then raise exception 'rate limit failed'; end if;
end $test$;
reset role;
do $test$ begin
if (select count(*) from rc_quote_requests where email='rc-test@example.invalid')<>1 then raise exception 'duplicate'; end if;
if exists(select 1 from rc_quote_requests where email='rc-test@example.invalid' and user_id is not null) then raise exception 'account assigned'; end if;
end $test$;
select 'guest submission, duplicate suppression, no anonymous reads, consent and rate limiting passed; fixtures rolled back' result;
rollback;
