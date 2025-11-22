-- Permettre aux agents de voir les profiles de leurs clients assignés
CREATE POLICY "Agents can view their clients profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients
    INNER JOIN public.agents ON agents.id = clients.agent_id
    WHERE clients.user_id = profiles.id
      AND agents.user_id = auth.uid()
  )
);