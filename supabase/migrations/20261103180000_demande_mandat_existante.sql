-- Anti-doublon des demandes de mandat.
-- Le formulaire public /nouveau-mandat est utilisé par des visiteurs anonymes qui n'ont pas le droit
-- de lire demandes_mandat (RLS) : l'ancienne vérification « select … eq(email) » ne trouvait donc jamais rien.
-- Cette fonction répond uniquement par oui/non (aucune donnée personnelle renvoyée).
create or replace function public.demande_mandat_existante(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.demandes_mandat d
    where lower(trim(d.email)) = lower(trim(p_email))
      and d.statut in ('en_attente', 'facture_envoyee', 'paye', 'active')
  );
$$;

revoke all on function public.demande_mandat_existante(text) from public;
grant execute on function public.demande_mandat_existante(text) to anon, authenticated;
