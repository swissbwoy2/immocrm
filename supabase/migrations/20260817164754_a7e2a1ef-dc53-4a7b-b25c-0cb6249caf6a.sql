
REVOKE SELECT ON public.annonceurs FROM anon;
GRANT SELECT (
  id, type_annonceur, civilite, prenom, nom, nom_entreprise, site_web, logo_url,
  ville, canton, pays, est_verifie, note_moyenne, nb_avis, nb_annonces_publiees,
  nb_annonces_actives, statut, created_at
) ON public.annonceurs TO anon;
