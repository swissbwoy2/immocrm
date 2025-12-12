-- Créer ou remplacer la fonction de mise à jour du comptage des clients
CREATE OR REPLACE FUNCTION update_agent_client_count_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour DELETE, mettre à jour l'ancien agent
  IF TG_OP = 'DELETE' THEN
    IF OLD.agent_id IS NOT NULL THEN
      UPDATE agents SET nombre_clients_assignes = (
        SELECT COUNT(*) FROM clients WHERE agent_id = OLD.agent_id
      ) WHERE id = OLD.agent_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Pour UPDATE, mettre à jour l'ancien agent si changement
  IF TG_OP = 'UPDATE' AND OLD.agent_id IS DISTINCT FROM NEW.agent_id THEN
    IF OLD.agent_id IS NOT NULL THEN
      UPDATE agents SET nombre_clients_assignes = (
        SELECT COUNT(*) FROM clients WHERE agent_id = OLD.agent_id
      ) WHERE id = OLD.agent_id;
    END IF;
  END IF;
  
  -- Mettre à jour le nouvel/actuel agent
  IF NEW.agent_id IS NOT NULL THEN
    UPDATE agents SET nombre_clients_assignes = (
      SELECT COUNT(*) FROM clients WHERE agent_id = NEW.agent_id
    ) WHERE id = NEW.agent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_update_agent_client_count ON clients;

-- Créer le trigger sur la table clients
CREATE TRIGGER trigger_update_agent_client_count
AFTER INSERT OR UPDATE OF agent_id OR DELETE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_agent_client_count_trigger();

-- Synchroniser les compteurs existants
UPDATE agents SET nombre_clients_assignes = (
  SELECT COUNT(*) FROM clients WHERE clients.agent_id = agents.id
);