DROP POLICY IF EXISTS "Annonceurs can manage photos of own annonces" ON public.photos_annonces_publiques;
CREATE POLICY "Annonceurs can manage photos of own annonces" ON public.photos_annonces_publiques
FOR ALL TO authenticated
USING (annonce_id IN (SELECT ap.id FROM public.annonces_publiques ap JOIN public.annonceurs a ON ap.annonceur_id = a.id WHERE a.user_id = auth.uid()))
WITH CHECK (annonce_id IN (SELECT ap.id FROM public.annonces_publiques ap JOIN public.annonceurs a ON ap.annonceur_id = a.id WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all photos" ON public.photos_annonces_publiques;
CREATE POLICY "Admins can manage all photos" ON public.photos_annonces_publiques
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can view photos of published annonces" ON public.photos_annonces_publiques;
CREATE POLICY "Public can view photos of published annonces" ON public.photos_annonces_publiques
FOR SELECT TO anon, authenticated
USING (annonce_id IN (SELECT ap.id FROM public.annonces_publiques ap WHERE ap.statut = 'publie'));

DROP POLICY IF EXISTS "Annonceurs can respond to reviews" ON public.avis_annonceurs;
CREATE POLICY "Annonceurs can respond to reviews" ON public.avis_annonceurs
FOR UPDATE TO authenticated
USING (annonceur_id IN (SELECT a.id FROM public.annonceurs a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.avis_annonceurs;
CREATE POLICY "Admins can manage all reviews" ON public.avis_annonceurs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories_annonces;
CREATE POLICY "Admins can manage categories" ON public.categories_annonces
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));