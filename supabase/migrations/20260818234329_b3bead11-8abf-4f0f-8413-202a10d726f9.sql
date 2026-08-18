ALTER TABLE public.offres
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS images_extracted_at timestamptz,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

DROP FUNCTION IF EXISTS public.list_public_offres();
CREATE OR REPLACE FUNCTION public.list_public_offres()
 RETURNS TABLE(id uuid, titre text, type_bien text, pieces numeric, surface numeric, adresse text, ville text, code_postal text, prix numeric, etage text, lien_annonce text, medias_galerie jsonb, date_envoi timestamp with time zone, disponibilite text, latitude numeric, longitude numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, d.titre, d.type_bien, d.pieces, d.surface, d.adresse, d.ville, d.code_postal,
         d.prix, d.etage, d.lien_annonce, d.medias_galerie, d.date_envoi, d.disponibilite,
         d.latitude, d.longitude
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

DROP FUNCTION IF EXISTS public.get_public_offre(uuid);
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
    o.prix, o.etage, o.lien_annonce, o.medias_galerie, o.date_envoi,
    COALESCE(NULLIF(TRIM(o.description_marketing), ''), o.description) AS description,
    o.equipements, o.annee_construction, o.type_chauffage, o.orientation, o.classe_energetique,
    o.disponibilite, o.contact_visite, o.contact_annonceur, o.contact_gerance,
    (SELECT MIN(v.date_visite) FROM public.visites v
      WHERE v.offre_id = o.id AND v.date_visite >= now()
        AND COALESCE(v.statut,'') NOT IN ('annulee','annulée')) AS prochaine_visite,
    o.latitude, o.longitude
  FROM public.offres o
  WHERE o.id = p_id
    AND o.statut IN ('envoyee','interesse','visite_planifiee','visite_confirmee','visite_effectuee','souhaite_postuler','candidature_deposee')
    AND o.date_envoi IS NOT NULL;
$function$;

GRANT EXECUTE ON FUNCTION public.list_public_offres() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_offre(uuid) TO anon, authenticated;