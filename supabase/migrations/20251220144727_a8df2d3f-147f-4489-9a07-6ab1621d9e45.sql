-- Mettre à jour la fonction pour supporter à la fois:
-- 1) l’agent principal (clients.agent_id)
-- 2) les co-agents via client_agents
-- et accepter en paramètre soit clients.user_id (profile id) soit clients.id (client record id)
CREATE OR REPLACE FUNCTION public.is_agent_of_client(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.clients c
      JOIN public.agents a ON a.id = c.agent_id
      WHERE (c.user_id = profile_id OR c.id = profile_id)
        AND a.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.client_agents ca
      JOIN public.agents a ON a.id = ca.agent_id
      JOIN public.clients c ON c.id = ca.client_id
      WHERE (c.user_id = profile_id OR ca.client_id = profile_id)
        AND a.user_id = auth.uid()
    );
$$;

-- Remplacer les policies clients pour utiliser is_agent_of_client(id)
DROP POLICY IF EXISTS "Agents can view their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Agents can update their assigned clients" ON public.clients;

CREATE POLICY "Agents can view their assigned clients"
ON public.clients
FOR SELECT
USING (public.is_agent_of_client(id));

CREATE POLICY "Agents can update their assigned clients"
ON public.clients
FOR UPDATE
USING (public.is_agent_of_client(id))
WITH CHECK (public.is_agent_of_client(id));
