GRANT SELECT ON public.annonces_publiques TO anon, authenticated;
GRANT SELECT ON public.photos_annonces_publiques TO anon, authenticated;
GRANT SELECT ON public.categories_annonces TO anon, authenticated;
GRANT ALL ON public.annonces_publiques TO service_role;
GRANT ALL ON public.photos_annonces_publiques TO service_role;
GRANT ALL ON public.categories_annonces TO service_role;

GRANT INSERT, UPDATE, DELETE ON public.annonces_publiques TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photos_annonces_publiques TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories_annonces TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favoris_annonces TO authenticated;
GRANT ALL ON public.favoris_annonces TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recherches_sauvegardees TO authenticated;
GRANT ALL ON public.recherches_sauvegardees TO service_role;

GRANT INSERT ON public.vues_annonces TO anon, authenticated;
GRANT SELECT ON public.vues_annonces TO authenticated;
GRANT ALL ON public.vues_annonces TO service_role;

GRANT SELECT (id, nom, prenom, nom_entreprise, type_annonceur, logo_url, note_moyenne, nb_avis, est_verifie, ville, canton, site_web, created_at)
  ON public.annonceurs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.annonceurs TO authenticated;
GRANT ALL ON public.annonceurs TO service_role;

DROP POLICY IF EXISTS "Public can view advertisers of published annonces" ON public.annonceurs;
CREATE POLICY "Public can view advertisers of published annonces"
ON public.annonceurs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.annonces_publiques ap
    WHERE ap.annonceur_id = annonceurs.id
      AND ap.statut = 'publie'
  )
);

DROP POLICY IF EXISTS "Public can view published annonces" ON public.annonces_publiques;
CREATE POLICY "Public can view published annonces"
ON public.annonces_publiques FOR SELECT
USING (statut = 'publie' AND (date_expiration IS NULL OR date_expiration > now()));

CREATE OR REPLACE FUNCTION public.increment_annonce_vue(_annonce_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.annonces_publiques
  SET nb_vues = COALESCE(nb_vues, 0) + 1
  WHERE id = _annonce_id AND statut = 'publie';
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_annonce_vue(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_annonce_favoris_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.annonces_publiques SET nb_favoris = COALESCE(nb_favoris, 0) + 1 WHERE id = NEW.annonce_id;
    RETURN NEW;
  ELSE
    UPDATE public.annonces_publiques SET nb_favoris = GREATEST(COALESCE(nb_favoris, 1) - 1, 0) WHERE id = OLD.annonce_id;
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_annonce_favoris_count ON public.favoris_annonces;
CREATE TRIGGER trg_sync_annonce_favoris_count
AFTER INSERT OR DELETE ON public.favoris_annonces
FOR EACH ROW EXECUTE FUNCTION public.sync_annonce_favoris_count();