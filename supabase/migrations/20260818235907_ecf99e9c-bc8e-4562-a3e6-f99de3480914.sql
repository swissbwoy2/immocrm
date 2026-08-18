CREATE OR REPLACE FUNCTION public.list_public_offres()
 RETURNS TABLE(id uuid, titre text, type_bien text, pieces numeric, surface numeric, adresse text, ville text, code_postal text, prix numeric, etage text, lien_annonce text, medias_galerie jsonb, date_envoi timestamp with time zone, disponibilite text, latitude numeric, longitude numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, d.titre, d.type_bien, d.pieces, d.surface, d.adresse, d.ville, d.code_postal,
         d.prix, d.etage, d.lien_annonce,
         CASE
           WHEN auth.uid() IS NOT NULL THEN d.medias_galerie
           WHEN jsonb_typeof(d.medias_galerie) = 'array' AND jsonb_array_length(d.medias_galerie) > 0
             THEN jsonb_build_array(d.medias_galerie -> 0)
           ELSE d.medias_galerie
         END AS medias_galerie,
         d.date_envoi, d.disponibilite, d.latitude, d.longitude
  FROM (
    SELECT DISTINCT ON (COALESCE(NULLIF(TRIM(o.lien_annonce), ''), COALESCE(o.adresse,'') || '|' || COALESCE(o.prix::text,'')))
      o.id,
      COALESCE(NULLIF(TRIM(o.titre), ''),
        CONCAT_WS(' ', NULLIF(o.type_bien,''), CASE WHEN o.pieces IS NOT NULL THEN o.pieces::text || ' pièces' END)
      ) AS titre,
      o.type_bien, o.pieces, o.surface, o.adresse,
      NULLIF(TRIM(REGEXP_REPLACE(COALESCE(SUBSTRING(o.adresse FROM '\d{4}\s+(.+)$'), SPLIT_PART(o.adresse, ',', -1)), '\s+', ' ', 'g')), '') AS ville,
      SUBSTRING(o.adresse FROM '(\d{4})') AS code_postal,
      o.prix, o.etage, o.lien_annonce, o.medias_galerie, o.date_envoi, o.disponibilite,
      o.latitude, o.longitude
    FROM public.offres o
    WHERE o.statut IN ('envoyee','interesse','visite_planifiee','visite_confirmee','visite_effectuee','souhaite_postuler','candidature_deposee')
      AND o.date_envoi IS NOT NULL
      AND o.date_envoi >= now() - interval '30 days'
      AND o.adresse IS NOT NULL
      AND o.prix IS NOT NULL
    ORDER BY COALESCE(NULLIF(TRIM(o.lien_annonce), ''), COALESCE(o.adresse,'') || '|' || COALESCE(o.prix::text,'')), o.date_envoi DESC
  ) d
  ORDER BY d.date_envoi DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_offre(p_id uuid)
 RETURNS TABLE(id uuid, titre text, type_bien text, pieces numeric, surface numeric, adresse text, ville text, code_postal text, prix numeric, etage text, lien_annonce text, medias_galerie jsonb, date_envoi timestamp with time zone, description text, equipements text[], annee_construction integer, type_chauffage text, orientation text, classe_energetique text, disponibilite text, contact_visite text, contact_annonceur text, contact_gerance text, prochaine_visite timestamp with time zone, latitude numeric, longitude numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id,
    COALESCE(NULLIF(TRIM(o.titre), ''),
      CONCAT_WS(' ', NULLIF(o.type_bien,''), CASE WHEN o.pieces IS NOT NULL THEN o.pieces::text || ' pièces' END)
    ) AS titre,
    o.type_bien, o.pieces, o.surface, o.adresse,
    NULLIF(TRIM(REGEXP_REPLACE(COALESCE(SUBSTRING(o.adresse FROM '\d{4}\s+(.+)$'), SPLIT_PART(o.adresse, ',', -1)), '\s+', ' ', 'g')), '') AS ville,
    SUBSTRING(o.adresse FROM '(\d{4})') AS code_postal,
    o.prix, o.etage, o.lien_annonce,
    CASE WHEN auth.uid() IS NOT NULL THEN o.medias_galerie ELSE NULL END AS medias_galerie,
    o.date_envoi,
    CASE WHEN auth.uid() IS NOT NULL
      THEN COALESCE(NULLIF(TRIM(o.description_marketing), ''), o.description) END AS description,
    CASE WHEN auth.uid() IS NOT NULL THEN o.equipements END AS equipements,
    o.annee_construction, o.type_chauffage, o.orientation, o.classe_energetique, o.disponibilite,
    CASE WHEN auth.uid() IS NOT NULL THEN o.contact_visite END AS contact_visite,
    CASE WHEN auth.uid() IS NOT NULL THEN o.contact_annonceur END AS contact_annonceur,
    CASE WHEN auth.uid() IS NOT NULL THEN o.contact_gerance END AS contact_gerance,
    CASE WHEN auth.uid() IS NOT NULL THEN
      (SELECT MIN(v.date_visite) FROM public.visites v
        WHERE v.offre_id = o.id AND v.date_visite >= now()
          AND COALESCE(v.statut,'') NOT IN ('annulee','annulée'))
    END AS prochaine_visite,
    o.latitude, o.longitude
  FROM public.offres o
  WHERE o.id = p_id
    AND o.statut IN ('envoyee','interesse','visite_planifiee','visite_confirmee','visite_effectuee','souhaite_postuler','candidature_deposee')
    AND o.date_envoi IS NOT NULL;
$function$;