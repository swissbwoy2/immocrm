-- Trigger pour synchroniser agents.statut avec profiles.actif
CREATE OR REPLACE FUNCTION sync_agent_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le profil est un agent, synchroniser le statut
  UPDATE agents
  SET statut = CASE 
    WHEN NEW.actif = true THEN 'actif'
    ELSE 'inactif'
  END,
  updated_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur profiles
DROP TRIGGER IF EXISTS sync_agent_status_trigger ON profiles;
CREATE TRIGGER sync_agent_status_trigger
  AFTER UPDATE OF actif ON profiles
  FOR EACH ROW
  WHEN (OLD.actif IS DISTINCT FROM NEW.actif)
  EXECUTE FUNCTION sync_agent_status();

-- Synchroniser les statuts existants
UPDATE agents
SET statut = CASE 
  WHEN p.actif = true THEN 'actif'
  ELSE 'inactif'
END,
updated_at = now()
FROM profiles p
WHERE agents.user_id = p.id;