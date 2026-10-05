\set ON_ERROR_STOP on
-- Run in a disposable PostgreSQL database; network and newsletter sends are stubbed.
create role anon; create role authenticated; create role service_role;
create schema private; create schema net;
create table profiles(id uuid primary key,prenom text,nom text,email text,anonymise_at timestamptz,is_demo_account bool,notifications_email bool);
create table user_roles(user_id uuid,role text);
create table clients(user_id uuid);
create table annonces_publiques(id uuid primary key,slug text,titre text);
create table annonce_creneaux(id uuid primary key,annonce_id uuid,date_heure timestamptz,actif bool,capacite_max int);
create table candidatures_location(user_id uuid,annonce_id uuid,creneau_id uuid,statut text,annulee bool);
create table notifications(id uuid default gen_random_uuid(),user_id uuid,type text,title text,message text,link text,metadata jsonb);
create table newsletters(id uuid primary key default gen_random_uuid(),name text,subject text,preheader text,html text,status text,tracking_enabled bool,created_by uuid not null);
create table newsletter_contacts(id uuid primary key default gen_random_uuid(),email text unique,first_name text,last_name text,kind text,categories text[],source text,excluded bool default false);
create table email_unsubscribes(email text); create table suppressed_emails(email text); create table newsletter_contact_suppressions(email text);
create table test_push(body jsonb); create table test_email(campaign_id uuid,recipients uuid[]);
create function private.edge_service_headers() returns jsonb language sql as $$select '{}'::jsonb$$;
create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int) returns bigint language plpgsql as $$begin insert into public.test_push values(body);return 1;end$$;
create function newsletter_enqueue(uuid,integer,uuid[],timestamptz,text) returns integer language plpgsql as $$begin insert into public.test_email values($1,$3);return cardinality($3);end$$;
\ir ../../supabase/migrations/20261005140000_annonce_slot_notifications.sql
begin;
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); s uuid:=gen_random_uuid();
 u1 uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();u3 uuid:=gen_random_uuid(); u4 uuid:=gen_random_uuid();u5 uuid:=gen_random_uuid();
 n int;
begin
 insert into annonces_publiques values(a,'test','Appartement <test>'),(b,'other','Other');
 insert into profiles values(u1,'A','A','a@example.test',null,false,true),(u2,'B','B','b@example.test',null,false,false),(u3,'C','C','c@example.test',null,false,true),(u4,'D','D','d@example.test',now(),false,true),(u5,'E','E','e@example.test',null,false,true);
 insert into user_roles values(u1,'candidat'),(u2,'candidat'),(u3,'admin');
 insert into candidatures_location values(u1,a,null,'desiste',true),(u1,a,null,'en_attente',false),(u2,a,null,'en_attente',false),(u3,b,null,'en_attente',false),(u4,a,null,'en_attente',false),(u5,a,null,'en_attente',false);
 insert into email_unsubscribes values('e@example.test');
 insert into annonce_creneaux values(s,a,now()+interval '1 day',false,20);
 if exists(select 1 from notifications) then raise exception 'Inactive slot notified';end if;
 update annonce_creneaux set actif=true where id=s;
 if (select count(*) from notifications)<>3 then raise exception 'Wrong or duplicate audience';end if;
 if (select count(*) from test_push)<>2 then raise exception 'Push audience routing failed';end if;
 if (select cardinality(recipients) from test_email)<>1 then raise exception 'Opt-outs not respected';end if;
 if exists(select 1 from notifications where message ~ '\d' or title ~ '\d') then raise exception 'Date/time leaked';end if;
 if not exists(select 1 from newsletters where html like '%Appartement &lt;test&gt;%') then raise exception 'HTML not escaped';end if;
 n:=notify_annonce_slot_available(s);if n<>0 then raise exception 'Replay duplicates';end if;
 update annonce_creneaux set actif=false where id=s;update annonce_creneaux set actif=true where id=s;
 if (select count(*) from newsletters)<>1 then raise exception 'Reactivation duplicates';end if;
 insert into annonce_creneaux values(gen_random_uuid(),a,now()-interval '1 day',true,20),(gen_random_uuid(),a,now()+interval '2 days',true,0);
 if (select count(*) from newsletters)<>1 then raise exception 'Past/full slot notified';end if;
 -- A newly added, available slot has a fresh per-slot notification identity.
 insert into annonce_creneaux values(gen_random_uuid(),a,now()+interval '3 days',true,20);
 if (select count(*) from newsletters)<>2 then raise exception 'New-slot trigger failed';end if;
 if has_function_privilege('authenticated','notify_annonce_slot_available(uuid)','execute') then raise exception 'Public dispatch permission';end if;
 raise notice 'PASS: activation, insert, isolation, deduplication, cancellation, privacy, opt-outs, full/past slots, and permissions';
end$$;
rollback;
