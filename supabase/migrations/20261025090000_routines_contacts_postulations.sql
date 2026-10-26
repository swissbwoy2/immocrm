-- Routines Logisorama : journal des contacts annonceurs, dossiers préparés (file de validation),
-- configuration et secrets des routines. Déjà appliqué en base le 25.10.2026 ; idempotent.

create table if not exists public.contacts_annonceurs (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid references public.offres(id) on delete set null,
  client_id uuid,
  lien_annonce text,
  adresse text,
  reference text,
  portail text,
  canal text not null default 'formulaire' check (canal in ('formulaire','email','flatfox','autre')),
  annonceur text,
  annonceur_email text,
  envoye_le timestamptz not null default now(),
  relance_le timestamptz,
  reponse_le timestamptz,
  reponse_resume text,
  statut text not null default 'envoye' check (statut in ('envoye','relance','repondu','sans_suite','erreur')),
  routine text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contacts_annonceurs_lien_idx on public.contacts_annonceurs (lien_annonce);
create index if not exists contacts_annonceurs_offre_idx on public.contacts_annonceurs (offre_id);
create index if not exists contacts_annonceurs_statut_idx on public.contacts_annonceurs (statut, envoye_le);
alter table public.contacts_annonceurs enable row level security;
drop policy if exists "Admins lisent les contacts annonceurs" on public.contacts_annonceurs;
create policy "Admins lisent les contacts annonceurs" on public.contacts_annonceurs for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table if not exists public.routine_config (
  cle text primary key,
  valeur text not null,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.routine_config enable row level security;
drop policy if exists "Admins lisent la config des routines" on public.routine_config;
create policy "Admins lisent la config des routines" on public.routine_config for select to authenticated using (public.has_role(auth.uid(), 'admin'));
insert into public.routine_config (cle, valeur, description) values
  ('firstcaution_lien_affiliation', 'https://www.firstcaution.ch/fr/onboarding/?ref=link=0062863', 'Lien d''affiliation FirstCaution (logo de la page d''accueil logisorama.ch)')
on conflict (cle) do nothing;

create table if not exists public.routine_secrets (
  nom text primary key,
  valeur text not null,
  created_at timestamptz not null default now()
);
alter table public.routine_secrets enable row level security;
insert into public.routine_secrets (nom, valeur)
  values ('postulation_gpt', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (nom) do nothing;

create table if not exists public.postulations_preparees (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid references public.offres(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  candidature_id uuid,
  canal text not null default 'email' check (canal in ('email','flatfox','immobilier','naef_ecandidat','autre')),
  regie_nom text,
  destinataire_email text,
  objet text,
  adresse_bien text,
  reference_bien text,
  client_nom text,
  client_email text,
  brouillon_ref text,
  pieces jsonb not null default '[]'::jsonb,
  formulaire_location_ok boolean,
  rapport text,
  source text not null default 'chatgpt',
  statut text not null default 'prepare' check (statut in ('prepare','a_valider','valide','envoye','refuse','erreur')),
  controle_resultat jsonb,
  motif_blocage text,
  valide_par uuid,
  valide_le timestamptz,
  envoye_le timestamptz,
  preuve_envoi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists postulations_preparees_statut_idx on public.postulations_preparees (statut, created_at);
create index if not exists postulations_preparees_offre_idx on public.postulations_preparees (offre_id);
alter table public.postulations_preparees enable row level security;
drop policy if exists "Admins et agents lisent les dossiers prepares" on public.postulations_preparees;
create policy "Admins et agents lisent les dossiers prepares" on public.postulations_preparees for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'agent'));
drop policy if exists "Admins et agents valident les dossiers prepares" on public.postulations_preparees;
create policy "Admins et agents valident les dossiers prepares" on public.postulations_preparees for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'agent'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'agent'));

create or replace function public.rapport_postulation(p_cle text, p_rapport jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_offre uuid;
  v_client uuid;
  v_id uuid;
  v_email text := nullif(trim(p_rapport->>'client_email'), '');
  v_adresse text := nullif(trim(p_rapport->>'adresse_bien'), '');
begin
  select exists(select 1 from routine_secrets where nom = 'postulation_gpt' and valeur = p_cle) into v_ok;
  if not coalesce(v_ok, false) then
    raise exception 'cle invalide' using errcode = '28000';
  end if;
  v_offre := nullif(p_rapport->>'offre_id', '')::uuid;
  v_client := nullif(p_rapport->>'client_id', '')::uuid;
  if v_client is null and v_email is not null then
    select c.id into v_client from clients c join profiles p on p.id = c.user_id
    where lower(p.email) = lower(v_email) limit 1;
  end if;
  if v_offre is null and v_client is not null and v_adresse is not null then
    select o.id into v_offre from offres o
    where o.client_id = v_client and o.adresse ilike '%' || split_part(v_adresse, ',', 1) || '%'
    order by o.date_envoi desc nulls last limit 1;
  end if;
  if v_client is null and v_offre is not null then
    select client_id into v_client from offres where id = v_offre;
  end if;
  insert into postulations_preparees (offre_id, client_id, canal, regie_nom, destinataire_email, objet, adresse_bien,
    reference_bien, client_nom, client_email, brouillon_ref, pieces, formulaire_location_ok, rapport, source, statut)
  values (v_offre, v_client,
    coalesce(nullif(p_rapport->>'canal',''), 'email'),
    p_rapport->>'regie_nom', p_rapport->>'destinataire_email', p_rapport->>'objet', v_adresse,
    p_rapport->>'reference_bien', p_rapport->>'client_nom', v_email, p_rapport->>'brouillon_ref',
    coalesce(p_rapport->'pieces', '[]'::jsonb),
    nullif(p_rapport->>'formulaire_location_ok','')::boolean,
    left(p_rapport->>'rapport', 4000), 'chatgpt', 'prepare')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.rapport_postulation(text, jsonb) from public;
grant execute on function public.rapport_postulation(text, jsonb) to anon, authenticated;
