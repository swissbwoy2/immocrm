CREATE OR REPLACE FUNCTION public.get_public_showcase_annonces()
 RETURNS TABLE(id uuid, titre text, type_bien text, adresse text, prix numeric, pieces numeric, surface numeric, etage text, lien_annonce text, medias_galerie jsonb, date_envoi timestamp with time zone, type_transaction text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id,
         a.titre,
         COALESCE(a.sous_type, c.nom) AS type_bien,
         COALESCE(NULLIF(TRIM(a.adresse), ''), CONCAT_WS(' ', a.code_postal, a.ville)) AS adresse,
         a.prix,
         a.nombre_pieces::numeric AS pieces,
         a.surface_habitable::numeric AS surface,
         a.etage::text AS etage,
         '/annonces/' || COALESCE(NULLIF(a.slug, ''), a.id::text) AS lien_annonce,
         COALESCE(
           (SELECT jsonb_agg(p.url ORDER BY p.est_principale DESC)
              FROM public.photos_annonces_publiques p
             WHERE p.annonce_id = a.id),
           '[]'::jsonb
         ) AS medias_galerie,
         COALESCE(a.date_publication, a.created_at) AS date_envoi,
         a.type_transaction
  FROM public.annonces_publiques a
  LEFT JOIN public.categories_annonces c ON c.id = a.categorie_id
  WHERE a.statut = 'publie'
    AND (a.date_expiration IS NULL OR a.date_expiration > now())
  ORDER BY COALESCE(a.date_publication, a.created_at) DESC
  LIMIT 20;
$function$;

REVOKE ALL ON FUNCTION public.get_public_showcase_annonces() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_showcase_annonces() TO anon, authenticated;