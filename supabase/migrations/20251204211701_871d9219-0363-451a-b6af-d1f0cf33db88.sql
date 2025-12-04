-- Policy DELETE pour les agents sur la table candidatures
-- Permet aux agents de supprimer les candidatures de leurs clients (via client_agents OU via clients.agent_id)
CREATE POLICY "Agents peuvent supprimer candidatures de leurs clients"
ON public.candidatures
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = candidatures.client_id
    AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = candidatures.client_id
    AND a.user_id = auth.uid()
  )
);