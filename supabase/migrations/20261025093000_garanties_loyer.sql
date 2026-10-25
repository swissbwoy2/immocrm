-- Suivi des demandes de garantie de loyer (routine FirstCaution). Déjà appliqué en base le 25.10.2026 ; idempotent.
create table if not exists public.garanties_loyer (
  id uuid primary key default gen_random_uuid(),
  candidature_id uuid unique,
  client_id uuid references public.clients(id) on delete set null,
  offre_id uuid references public.offres(id) on delete set null,
  fournisseur text not null default 'firstcaution',
  statut text not null default 'a_faire' check (statut in ('a_faire','en_cours','envoyee','erreur','annulee')),
  montant_garantie numeric,
  loyer_net numeric,
  date_entree date,
  reference text,
  motif text,
  envoyee_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.garanties_loyer enable row level security;
drop policy if exists "Admins et agents voient les garanties" on public.garanties_loyer;
create policy "Admins et agents voient les garanties" on public.garanties_loyer for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'agent'));
drop policy if exists "Admins et agents demandent une garantie" on public.garanties_loyer;
create policy "Admins et agents demandent une garantie" on public.garanties_loyer for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'agent'));
