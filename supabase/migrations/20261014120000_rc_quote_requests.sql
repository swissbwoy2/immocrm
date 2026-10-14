-- RC quote enquiries belong to the existing account; never create users or subscribe them to marketing.
create table public.rc_quote_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  first_name text not null check (length(first_name) between 1 and 100),
  last_name text not null check (length(last_name) between 1 and 100),
  current_address text not null check (length(current_address) between 5 and 500),
  email text not null check (length(email)<=254 and email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'),
  phone text not null check (length(phone) between 7 and 40),
  insured_people integer not null check (insured_people between 1 and 30),
  birth_date date not null,
  nationality text not null check (length(nationality) between 2 and 100),
  consent_version text not null default 'rc-2026-10-14',
  consent_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','in_progress','offer_sent','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,request_key)
);
create index rc_quote_requests_recent on public.rc_quote_requests(created_at desc);
create unique index rc_quote_requests_one_open on public.rc_quote_requests(user_id) where status<>'closed';
alter table public.rc_quote_requests enable row level security;
revoke all on public.rc_quote_requests from anon,authenticated;
grant select on public.rc_quote_requests to authenticated;
grant all on public.rc_quote_requests to service_role;
create policy rc_quote_owner_or_admin_read on public.rc_quote_requests for select to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create function public.request_rc_quote(p_request_key uuid,p_first_name text,p_last_name text,p_current_address text,p_email text,p_phone text,p_insured_people integer,p_birth_date date,p_nationality text,p_consent boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; uid uuid:=auth.uid();
begin
  if uid is null or not (public.has_role(uid,'client') or public.has_role(uid,'candidat') or public.has_role(uid,'admin')) then
    raise exception 'Connecte-toi à ton compte client ou candidat pour demander une offre.' using errcode='42501';
  end if;
  if p_consent is distinct from true then raise exception 'Merci de confirmer la demande de contact pour ton offre RC.'; end if;
  if p_request_key is null or p_first_name is null or p_last_name is null or p_current_address is null or p_email is null or p_phone is null or p_nationality is null or p_birth_date is null or p_insured_people is null then
    raise exception 'Complète tous les champs du formulaire.';
  end if;
  if p_birth_date>current_date or p_birth_date<current_date-interval '120 years' then raise exception 'Vérifie ta date de naissance.'; end if;
  if p_phone !~ '^[+0-9(). /-]+$' or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 7 and 15 then raise exception 'Vérifie ton numéro de téléphone.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':rc-quote',0));
  select id into result from public.rc_quote_requests where user_id=uid and (request_key=p_request_key or status<>'closed') order by created_at desc limit 1;
  if result is not null then return result; end if;
  if (select count(*) from public.rc_quote_requests where user_id=uid and created_at>now()-interval '1 day')>=3 then raise exception 'Tes demandes ont bien été enregistrées. Merci de contacter notre équipe pour la suite.'; end if;
  insert into public.rc_quote_requests(user_id,request_key,first_name,last_name,current_address,email,phone,insured_people,birth_date,nationality)
  values(uid,p_request_key,trim(p_first_name),trim(p_last_name),trim(p_current_address),lower(trim(p_email)),trim(p_phone),p_insured_people,p_birth_date,trim(p_nationality)) returning id into result;
  return result;
end $$;
revoke all on function public.request_rc_quote(uuid,text,text,text,text,text,integer,date,text,boolean) from public,anon;
grant execute on function public.request_rc_quote(uuid,text,text,text,text,text,integer,date,text,boolean) to authenticated;

create function public.admin_set_rc_quote_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Accès réservé à l’administration' using errcode='42501'; end if;
  if p_status is null or p_status not in ('new','in_progress','offer_sent','closed') then raise exception 'Statut invalide'; end if;
  update public.rc_quote_requests set status=p_status,updated_at=now() where id=p_id;
  if not found then raise exception 'Demande introuvable'; end if;
end $$;
revoke all on function public.admin_set_rc_quote_status(uuid,text) from public,anon;
grant execute on function public.admin_set_rc_quote_status(uuid,text) to authenticated;

-- An RC enquiry is useful to active clients too: do not apply the renter-conversion exclusion here.
create function public.newsletter_rc_audience() returns table(contact_id uuid) language plpgsql security definer set search_path='' as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Accès réservé à l’administration' using errcode='42501'; end if;
  return query select distinct c.id from public.newsletter_contacts c join public.profiles p on lower(trim(p.email))=c.email
    where not c.excluded and p.actif is true and p.notifications_email is distinct from false
    and not exists(select 1 from public.email_unsubscribes u where lower(trim(u.email))=c.email)
    and not exists(select 1 from public.newsletter_contact_suppressions s where lower(trim(s.email))=c.email)
    and (public.has_role(p.id,'candidat') or (public.has_role(p.id,'client') and exists(select 1 from public.clients cl where cl.user_id=p.id and cl.statut='actif')));
end $$;
revoke all on function public.newsletter_rc_audience() from public,anon;
grant execute on function public.newsletter_rc_audience() to authenticated;
