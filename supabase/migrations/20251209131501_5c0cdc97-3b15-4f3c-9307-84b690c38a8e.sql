
-- Supprimer l'ancienne politique qui ne fonctionne pas correctement
DROP POLICY IF EXISTS "Agents can view their clients documents" ON documents;

-- Créer une nouvelle politique qui vérifie via client_id ET client_agents
CREATE POLICY "Agents can view their clients documents" 
ON documents 
FOR SELECT 
USING (
  -- Via agent_id direct sur clients
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = documents.client_id AND a.user_id = auth.uid()
  )
  OR
  -- Via la table de jonction client_agents
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = documents.client_id AND a.user_id = auth.uid()
  )
);

-- Supprimer et recréer la politique pour UPDATE
DROP POLICY IF EXISTS "Agents can update their clients documents" ON documents;

CREATE POLICY "Agents can update their clients documents" 
ON documents 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = documents.client_id AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = documents.client_id AND a.user_id = auth.uid()
  )
);

-- Supprimer et recréer la politique pour INSERT
DROP POLICY IF EXISTS "Agents can insert documents for their clients" ON documents;

CREATE POLICY "Agents can insert documents for their clients" 
ON documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = documents.client_id AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = documents.client_id AND a.user_id = auth.uid()
  )
);

-- Ajouter une politique DELETE pour les agents
DROP POLICY IF EXISTS "Agents can delete their clients documents" ON documents;

CREATE POLICY "Agents can delete their clients documents" 
ON documents 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = documents.client_id AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = documents.client_id AND a.user_id = auth.uid()
  )
);
