-- Permettre aux agents de voir les documents de leurs clients assignés
CREATE POLICY "Agents can view their clients documents"
ON public.documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.agents a ON a.id = c.agent_id
    WHERE c.user_id = documents.user_id
    AND a.user_id = auth.uid()
  )
);