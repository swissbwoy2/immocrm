
-- 1. Ajouter les entrées manquantes dans client_agents pour tous les clients avec un agent_id
INSERT INTO client_agents (client_id, agent_id, is_primary, commission_split)
SELECT 
  c.id as client_id,
  c.agent_id,
  true as is_primary,
  COALESCE(c.commission_split, 50) as commission_split
FROM clients c
WHERE c.agent_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM client_agents ca WHERE ca.client_id = c.id AND ca.agent_id = c.agent_id
)
ON CONFLICT DO NOTHING;

-- 2. Créer les conversations manquantes pour les clients avec un agent
INSERT INTO conversations (client_id, agent_id, subject, conversation_type)
SELECT 
  c.id::text as client_id,
  c.agent_id::text as agent_id,
  'Échanges' as subject,
  'client-agent' as conversation_type
FROM clients c
WHERE c.agent_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM conversations conv 
  WHERE conv.client_id = c.id::text 
  AND conv.agent_id = c.agent_id::text
);

-- 3. Ajouter les agents dans conversation_agents pour les conversations existantes
INSERT INTO conversation_agents (conversation_id, agent_id)
SELECT 
  conv.id as conversation_id,
  conv.agent_id::uuid as agent_id
FROM conversations conv
WHERE conv.conversation_type = 'client-agent'
AND conv.agent_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM conversation_agents ca 
  WHERE ca.conversation_id = conv.id 
  AND ca.agent_id::text = conv.agent_id
)
ON CONFLICT DO NOTHING;

-- 4. Créer une fonction trigger pour synchroniser automatiquement les assignations d'agent
CREATE OR REPLACE FUNCTION public.sync_client_agent_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Si un agent_id est assigné ou modifié
  IF NEW.agent_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.agent_id IS DISTINCT FROM NEW.agent_id) THEN
    -- Ajouter dans client_agents si pas déjà présent
    INSERT INTO client_agents (client_id, agent_id, is_primary, commission_split)
    VALUES (NEW.id, NEW.agent_id, true, COALESCE(NEW.commission_split, 50))
    ON CONFLICT (client_id, agent_id) DO NOTHING;
    
    -- Créer une conversation si elle n'existe pas
    INSERT INTO conversations (client_id, agent_id, subject, conversation_type)
    SELECT 
      NEW.id::text,
      NEW.agent_id::text,
      'Échanges',
      'client-agent'
    WHERE NOT EXISTS (
      SELECT 1 FROM conversations 
      WHERE client_id = NEW.id::text 
      AND agent_id = NEW.agent_id::text
    );
    
    -- Ajouter l'agent dans conversation_agents pour la nouvelle conversation
    INSERT INTO conversation_agents (conversation_id, agent_id)
    SELECT conv.id, NEW.agent_id
    FROM conversations conv
    WHERE conv.client_id = NEW.id::text 
    AND conv.agent_id = NEW.agent_id::text
    AND NOT EXISTS (
      SELECT 1 FROM conversation_agents ca 
      WHERE ca.conversation_id = conv.id 
      AND ca.agent_id = NEW.agent_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Supprimer le trigger s'il existe déjà et le recréer
DROP TRIGGER IF EXISTS trigger_sync_client_agent_assignment ON clients;

CREATE TRIGGER trigger_sync_client_agent_assignment
AFTER INSERT OR UPDATE OF agent_id ON clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_agent_on_assignment();
