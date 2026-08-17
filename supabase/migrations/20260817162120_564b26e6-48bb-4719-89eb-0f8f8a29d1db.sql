CREATE OR REPLACE FUNCTION public.get_public_showcase_offres()
 RETURNS TABLE(id uuid, titre text, type_bien text, adresse text, prix numeric, pieces numeric, surface numeric, etage text, lien_annonce text, medias_galerie jsonb, date_envoi timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM (
    SELECT DISTINCT ON (COALESCE(NULLIF(TRIM(o.lien_annonce), ''), COALESCE(o.adresse,'') || '|' || COALESCE(o.prix::text,'')))
           o.id, o.titre, o.type_bien, o.adresse, o.prix, o.pieces, o.surface,
           o.etage, o.lien_annonce, o.medias_galerie, o.date_envoi
    FROM public.offres o
    WHERE o.statut IN ('envoyee','interesse','visite_planifiee','visite_confirmee','visite_effectuee','souhaite_postuler')
      AND o.date_envoi IS NOT NULL
    ORDER BY COALESCE(NULLIF(TRIM(o.lien_annonce), ''), COALESCE(o.adresse,'') || '|' || COALESCE(o.prix::text,'')), o.date_envoi DESC
  ) d
  ORDER BY d.date_envoi DESC
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_showcase_visites()
 RETURNS TABLE(id uuid, date_visite timestamp with time zone, titre text, type_bien text, adresse text, prix numeric, pieces numeric, surface numeric, etage text, lien_annonce text, medias_galerie jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM (
    SELECT DISTINCT ON (COALESCE(NULLIF(TRIM(o.lien_annonce), ''), COALESCE(o.adresse, v.adresse, '') || '|' || COALESCE(o.prix::text,'')))
           v.id, v.date_visite, o.titre, o.type_bien,
           COALESCE(o.adresse, v.adresse) AS adresse,
           o.prix, o.pieces, o.surface, o.etage, o.lien_annonce, o.medias_galerie
    FROM public.visites v
    LEFT JOIN public.offres o ON o.id = v.offre_id
    WHERE v.date_visite >= now()
      AND COALESCE(v.statut,'') NOT IN ('annulee','annule')
    ORDER BY COALESCE(NULLIF(TRIM(o.lien_annonce), ''), COALESCE(o.adresse, v.adresse, '') || '|' || COALESCE(o.prix::text,'')), v.date_visite ASC
  ) d
  ORDER BY d.date_visite ASC
  LIMIT 20;
$function$;