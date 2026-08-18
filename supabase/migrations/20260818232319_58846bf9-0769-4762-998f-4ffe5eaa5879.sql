DROP POLICY IF EXISTS "Admins can manage all annonceurs" ON public.annonceurs;
CREATE POLICY "Admins can manage all annonceurs" ON public.annonceurs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can manage own annonceur profile" ON public.annonceurs;
CREATE POLICY "Users can manage own annonceur profile" ON public.annonceurs
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view advertisers with published listings" ON public.annonceurs
FOR SELECT TO anon, authenticated
USING (public.annonceur_has_published_annonce(id));

GRANT SELECT (id, nom, nom_entreprise, type_annonceur, logo_url, note_moyenne)
  ON public.annonceurs TO anon;