
-- CORRIGER LA RÉCURSION CIRCULAIRE entre clients et agents

-- 1. Supprimer les policies qui causent la récursion
DROP POLICY IF EXISTS "Agents can view their assigned clients" ON clients;
DROP POLICY IF EXISTS "Clients can view their assigned agent" ON agents;

-- 2. Créer une fonction SECURITY DEFINER pour vérifier si un agent est assigné à un client
CREATE OR REPLACE FUNCTION public.is_assigned_agent(_client_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.user_id = _client_user_id
    AND a.user_id = auth.uid()
  );
$$;

-- 3. Créer une fonction SECURITY DEFINER pour obtenir l'agent assigné d'un client
CREATE OR REPLACE FUNCTION public.get_client_agent_id(_client_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agent_id
  FROM clients
  WHERE user_id = _client_user_id
  LIMIT 1;
$$;

-- 4. Recréer les policies SANS récursion en utilisant les fonctions
CREATE POLICY "Agents can view their assigned clients" 
ON clients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM agents
    WHERE agents.user_id = auth.uid()
    AND agents.id = clients.agent_id
  )
);

CREATE POLICY "Clients can view their assigned agent" 
ON agents 
FOR SELECT 
USING (id = public.get_client_agent_id(auth.uid()));
