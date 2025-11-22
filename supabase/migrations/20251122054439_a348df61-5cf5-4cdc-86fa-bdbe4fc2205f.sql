
-- SOLUTION FINALE : Utiliser uniquement des fonctions SECURITY DEFINER

-- 1. Supprimer TOUTES les policies problématiques
DROP POLICY IF EXISTS "Agents can view their assigned clients" ON clients;
DROP POLICY IF EXISTS "Clients can view their assigned agent" ON agents;
DROP POLICY IF EXISTS "Agents can update their assigned clients" ON clients;

-- 2. Créer une fonction pour vérifier si l'utilisateur actuel est l'agent du client
CREATE OR REPLACE FUNCTION public.is_agent_of_client_record(_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = _client_id
    AND a.user_id = auth.uid()
  );
END;
$$;

-- 3. Créer une fonction pour vérifier si un agent est assigné à l'utilisateur client actuel
CREATE OR REPLACE FUNCTION public.is_my_assigned_agent(_agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM clients
    WHERE user_id = auth.uid()
    AND agent_id = _agent_id
  );
END;
$$;

-- 4. Recréer les policies en utilisant UNIQUEMENT les fonctions
CREATE POLICY "Agents can view their assigned clients" 
ON clients 
FOR SELECT 
USING (public.is_agent_of_client_record(id));

CREATE POLICY "Agents can update their assigned clients" 
ON clients 
FOR UPDATE 
USING (public.is_agent_of_client_record(id));

CREATE POLICY "Clients can view their assigned agent" 
ON agents 
FOR SELECT 
USING (public.is_my_assigned_agent(id));
