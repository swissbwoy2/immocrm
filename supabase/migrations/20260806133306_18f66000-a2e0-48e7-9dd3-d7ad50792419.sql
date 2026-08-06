CREATE POLICY "Automation can read clients"
ON public.clients FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read client candidates"
ON public.client_candidates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read documents"
ON public.documents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can add documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read visites"
ON public.visites FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read visite comptes rendus"
ON public.visite_comptes_rendus FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));