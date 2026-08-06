CREATE POLICY "Automation can read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read agents"
ON public.agents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read client agents"
ON public.client_agents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read offres"
ON public.offres FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read calendar events"
ON public.calendar_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read candidatures"
ON public.candidatures FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read document requests"
ON public.document_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));

CREATE POLICY "Automation can read client notes"
ON public.client_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'automation_operator'));