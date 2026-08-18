DROP POLICY IF EXISTS "Annonceurs can view own annonces" ON public.annonces_publiques;
CREATE POLICY "Annonceurs can view own annonces" ON public.annonces_publiques
FOR SELECT TO authenticated
USING (annonceur_id IN (SELECT a.id FROM public.annonceurs a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Annonceurs can update own annonces" ON public.annonces_publiques;
CREATE POLICY "Annonceurs can update own annonces" ON public.annonces_publiques
FOR UPDATE TO authenticated
USING (annonceur_id IN (SELECT a.id FROM public.annonceurs a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Annonceurs can delete own annonces" ON public.annonces_publiques;
CREATE POLICY "Annonceurs can delete own annonces" ON public.annonces_publiques
FOR DELETE TO authenticated
USING (annonceur_id IN (SELECT a.id FROM public.annonceurs a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all annonces" ON public.annonces_publiques;
CREATE POLICY "Admins can manage all annonces" ON public.annonces_publiques
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can view published annonces" ON public.annonces_publiques;
CREATE POLICY "Public can view published annonces" ON public.annonces_publiques
FOR SELECT TO anon, authenticated
USING (statut = 'publie' AND (date_expiration IS NULL OR date_expiration > now()));