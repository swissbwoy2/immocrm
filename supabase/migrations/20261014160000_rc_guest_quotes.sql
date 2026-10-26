-- Public quote intake does not create an account or grant access to existing requests.
alter table public.rc_quote_requests alter column user_id drop not null;
create unique index rc_guest_request_key on public.rc_quote_requests(request_key) where user_id is null;
create unique index rc_guest_one_open_email on public.rc_quote_requests(lower(email)) where user_id is null and status<>'closed';

create function public.request_rc_quote_guest(p_request_key uuid,p_first_name text,p_last_name text,p_current_address text,p_email text,p_phone text,p_insured_people integer,p_birth_date date,p_nationality text,p_consent boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare normalized_email text:=lower(trim(p_email)); headers jsonb; network text;
begin
  if p_consent is distinct from true then raise exception 'Merci de confirmer la demande de contact pour ton offre RC.'; end if;
  if p_request_key is null or p_first_name is null or p_last_name is null or p_current_address is null or p_email is null or p_phone is null or p_nationality is null or p_birth_date is null or p_insured_people is null then raise exception 'Complète tous les champs du formulaire.'; end if;
  if length(trim(p_first_name)) not between 1 and 100 or length(trim(p_last_name)) not between 1 and 100 or length(trim(p_current_address)) not between 5 and 500 or length(trim(p_nationality)) not between 2 and 100 or p_insured_people not between 1 and 30 or length(normalized_email)>254 or normalized_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' then raise exception 'Vérifie les informations du formulaire.'; end if;
  if p_birth_date>current_date or p_birth_date<current_date-interval '120 years' then raise exception 'Vérifie ta date de naissance.'; end if;
  if length(p_phone)>40 or p_phone !~ '^[+0-9(). /-]+$' or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 7 and 15 then raise exception 'Vérifie ton numéro de téléphone.'; end if;
  headers:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  network:=coalesce(nullif(headers->>'cf-connecting-ip',''),nullif(split_part(headers->>'x-forwarded-for',',',1),''),'unknown');
  -- Limits also persist when refusing a request: return null instead of raising.
  if not public.consume_edge_rate_limit('rc-guest-network',md5(network),3600,20) then return null; end if;
  if not public.consume_edge_rate_limit('rc-guest-email',md5(normalized_email),86400,5) then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(normalized_email||':rc-guest',0));
  -- Never reveal an existing request ID, ownership, or any personal information.
  if exists(select 1 from public.rc_quote_requests where user_id is null and (request_key=p_request_key or (email=normalized_email and status<>'closed'))) then return p_request_key; end if;
  insert into public.rc_quote_requests(user_id,request_key,first_name,last_name,current_address,email,phone,insured_people,birth_date,nationality)
  values(null,p_request_key,trim(p_first_name),trim(p_last_name),trim(p_current_address),normalized_email,trim(p_phone),p_insured_people,p_birth_date,trim(p_nationality));
  return p_request_key;
end $$;
revoke all on function public.request_rc_quote_guest(uuid,text,text,text,text,text,integer,date,text,boolean) from public;
grant execute on function public.request_rc_quote_guest(uuid,text,text,text,text,text,integer,date,text,boolean) to anon,authenticated;
-- Existing SELECT RLS and table grants are unchanged: anonymous visitors cannot read requests.
