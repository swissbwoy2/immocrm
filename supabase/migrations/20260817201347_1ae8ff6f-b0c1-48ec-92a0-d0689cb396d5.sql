REVOKE SELECT ON public.annonceurs FROM anon;
GRANT SELECT (
  id, nom, prenom, nom_entreprise, type_annonceur, logo_url,
  note_moyenne, nb_avis, est_verifie, created_at,
  site_web, ville, canton, pays
) ON public.annonceurs TO anon;