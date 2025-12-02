-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Agents can create conversations" ON public.conversations;

-- Créer une nouvelle policy plus robuste pour les agents
CREATE POLICY "Agents can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Vérifier que l'utilisateur connecté est un agent valide
  EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = conversations.agent_id::uuid 
    AND a.user_id = auth.uid()
  )
  AND 
  -- Vérifier que l'agent a accès au client (si client_id fourni)
  (
    conversations.client_id IS NULL 
    OR 
    EXISTS (
      SELECT 1 FROM client_agents ca
      WHERE ca.client_id = conversations.client_id::uuid
      AND ca.agent_id = conversations.agent_id::uuid
    )
  )
);