-- Candidates usually have profiles.actif=false until they activate a paid service.
-- Match their role; reserve the active-profile check for clients. Sync missing account
-- contacts without changing existing categories, exclusions or subscriptions.
create or replace function public.newsletter_rc_audience() returns table(contact_id uuid) language plpgsql security definer set search_path='' as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Accès réservé à l’administration' using errcode='42501'; end if;
  insert into public.newsletter_contacts(email,first_name,last_name,kind,categories,source,excluded)
  select distinct on (lower(trim(p.email))) lower(trim(p.email)),coalesce(p.prenom,''),coalesce(p.nom,''),
    case when public.has_role(p.id,'client') then 'client' else 'prospect' end,'{}'::text[],'application',
    exists(select 1 from public.newsletter_contact_suppressions s where lower(trim(s.email))=lower(trim(p.email)))
  from public.profiles p join auth.users u on u.id=p.id
  where (u.banned_until is null or u.banned_until<=now()) and length(p.email)<=254
    and lower(trim(p.email)) ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
    and (public.has_role(p.id,'candidat') or (p.actif is true and public.has_role(p.id,'client') and exists(select 1 from public.clients cl where cl.user_id=p.id and cl.statut='actif')))
  order by lower(trim(p.email)),p.id
  on conflict(email) do nothing;

  return query select distinct c.id from public.newsletter_contacts c join public.profiles p on lower(trim(p.email))=c.email join auth.users u on u.id=p.id
    where not c.excluded and p.notifications_email is distinct from false
    and (u.banned_until is null or u.banned_until<=now())
    and not exists(select 1 from public.email_unsubscribes unsub where lower(trim(unsub.email))=c.email)
    and not exists(select 1 from public.newsletter_contact_suppressions s where lower(trim(s.email))=c.email)
    and (public.has_role(p.id,'candidat') or (p.actif is true and public.has_role(p.id,'client') and exists(select 1 from public.clients cl where cl.user_id=p.id and cl.statut='actif')));
end $$;
