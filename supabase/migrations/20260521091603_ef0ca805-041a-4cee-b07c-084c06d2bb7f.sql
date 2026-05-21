DROP POLICY IF EXISTS "Agents multi peuvent gérer candidatures" ON public.candidatures;

CREATE POLICY "Agents (principal + co) peuvent gérer candidatures"
ON public.candidatures
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.agents a ON a.id = c.agent_id
    WHERE c.id = candidatures.client_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = candidatures.client_id AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.agents a ON a.id = c.agent_id
    WHERE c.id = candidatures.client_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = candidatures.client_id AND a.user_id = auth.uid()
  )
);