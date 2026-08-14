CREATE OR REPLACE FUNCTION public.annonceur_has_published_annonce(_annonceur_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.annonces_publiques ap
    WHERE ap.annonceur_id = _annonceur_id
      AND ap.statut = 'publie'
  );
$$;
GRANT EXECUTE ON FUNCTION public.annonceur_has_published_annonce(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view advertisers of published annonces" ON public.annonceurs;
CREATE POLICY "Public can view advertisers of published annonces"
ON public.annonceurs FOR SELECT
USING (public.annonceur_has_published_annonce(id));