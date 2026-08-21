-- Public users must never read annonceur contact details directly.
DROP POLICY IF EXISTS "Public can view advertisers with published listings"
  ON public.annonceurs;

REVOKE SELECT ON TABLE public.annonceurs FROM anon;

GRANT SELECT (id, nom, nom_entreprise, type_annonceur, logo_url, note_moyenne)
  ON public.annonceurs TO anon;

CREATE POLICY "Anonymous users can view safe advertiser identity"
ON public.annonceurs
FOR SELECT TO anon
USING (public.annonceur_has_published_annonce(id));

-- Keep the public directory behind a narrow SECURITY DEFINER function that
-- returns only non-sensitive fields and only advertisers with a live listing.
CREATE OR REPLACE FUNCTION public.get_public_annonceurs()
RETURNS TABLE(
  id uuid,
  type_annonceur text,
  nom_entreprise text,
  nom text,
  prenom text,
  ville text,
  canton text,
  logo_url text,
  note_moyenne numeric,
  nb_avis integer,
  est_verifie boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.type_annonceur, a.nom_entreprise, a.nom, a.prenom,
         a.ville, a.canton, a.logo_url, a.note_moyenne, a.nb_avis,
         a.est_verifie, a.created_at
  FROM public.annonceurs AS a
  WHERE a.statut = 'actif'
    AND public.annonceur_has_published_annonce(a.id);
$$;

REVOKE ALL ON FUNCTION public.get_public_annonceurs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_annonceurs() TO anon, authenticated;
