-- ============================================================================
-- SECURITY FIX 1: Restrict public exposure of annonceurs sensitive PII
-- ============================================================================
-- Issue: The 'Public can view active annonceurs' RLS policy allowed any role
-- (incl. anon) to SELECT every column, including email, telephone, adresse,
-- date_naissance, derniere_connexion. Public consumers only need marketing
-- fields (display name, logo, rating).
--
-- Fix:
--   1. Restrict the public SELECT policy to only the 'anon' + 'authenticated'
--      roles, but rely on column-level grants to anon to limit which columns
--      can be read without authentication.
--   2. Revoke SELECT on the table from 'anon' and re-grant only the safe
--      marketing columns. Authenticated users still see full rows of the
--      annonceurs they have access to via the existing policies.
-- ============================================================================

-- Revoke broad SELECT from anon (if previously granted via PUBLIC default).
REVOKE SELECT ON public.annonceurs FROM anon;

-- Grant SELECT only on non-sensitive marketing columns to anon.
GRANT SELECT (
  id,
  type_annonceur,
  nom_entreprise,
  prenom,
  nom,
  logo_url,
  ville,
  canton,
  pays,
  est_verifie,
  statut,
  note_moyenne,
  nb_avis,
  nb_annonces_publiees,
  nb_annonces_actives,
  site_web,
  created_at
) ON public.annonceurs TO anon;

-- Authenticated users keep full SELECT (RLS still scopes rows: own row,
-- admin role, or active rows).
GRANT SELECT ON public.annonceurs TO authenticated;

-- The existing 'Public can view active annonceurs' policy stays, but the
-- column-level grants now hide PII from unauthenticated visitors.

COMMENT ON TABLE public.annonceurs IS
  'Advertiser profiles. Anon role can only read non-PII marketing columns
   (id, names, logo, city/canton, ratings). Authenticated users see full
   rows for active advertisers; admins and the owner see everything.';