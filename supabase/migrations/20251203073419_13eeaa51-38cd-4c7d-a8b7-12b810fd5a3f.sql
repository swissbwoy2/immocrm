-- Créer la fonction SECURITY DEFINER pour vérifier si un agent peut créer une conversation
CREATE OR REPLACE FUNCTION public.can_agent_create_conversation(_agent_id text, _client_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Vérifier que l'agent existe et appartient à l'utilisateur courant
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = _agent_id::uuid
      AND a.user_id = auth.uid()
    )
    AND
    -- Vérifier que l'agent a accès au client (ou client_id est NULL)
    (
      _client_id IS NULL
      OR
      EXISTS (
        SELECT 1 FROM client_agents ca
        WHERE ca.client_id = _client_id::uuid
        AND ca.agent_id = _agent_id::uuid
      )
    );
$$;

-- Supprimer les anciennes policies INSERT
DROP POLICY IF EXISTS "Agents can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can create conversations" ON public.conversations;

-- Recréer la policy pour les agents avec la fonction SECURITY DEFINER
CREATE POLICY "Agents can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.can_agent_create_conversation(agent_id, client_id)
);

-- Recréer la policy pour les admins (TO authenticated au lieu de TO public)
CREATE POLICY "Admins can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);