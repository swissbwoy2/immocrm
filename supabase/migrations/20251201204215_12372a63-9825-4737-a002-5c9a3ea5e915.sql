-- Create trigger to notify agents when a co-agent is added
CREATE OR REPLACE FUNCTION notify_on_coagent_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_name TEXT;
  v_new_agent_name TEXT;
  v_new_agent_user_id UUID;
  v_existing_agent RECORD;
BEGIN
  -- Only trigger on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Get client name
    SELECT COALESCE(p.prenom || ' ' || p.nom, p.email) INTO v_client_name
    FROM clients c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.id = NEW.client_id;
    
    -- Get new agent name and user_id
    SELECT a.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email) INTO v_new_agent_user_id, v_new_agent_name
    FROM agents a
    JOIN profiles p ON p.id = a.user_id
    WHERE a.id = NEW.agent_id;
    
    -- Notify all existing agents for this client (except the new one)
    FOR v_existing_agent IN
      SELECT a.user_id, COALESCE(p.prenom || ' ' || p.nom, p.email) as agent_name
      FROM client_agents ca
      JOIN agents a ON a.id = ca.agent_id
      JOIN profiles p ON p.id = a.user_id
      WHERE ca.client_id = NEW.client_id
      AND ca.agent_id != NEW.agent_id
    LOOP
      PERFORM create_notification(
        v_existing_agent.user_id,
        'coagent_added',
        '👥 Nouveau co-agent assigné',
        v_new_agent_name || ' a été ajouté comme co-agent pour ' || COALESCE(v_client_name, 'un client'),
        '/agent/mes-clients',
        jsonb_build_object('client_id', NEW.client_id::text, 'new_agent_name', v_new_agent_name)
      );
    END LOOP;
    
    -- Also notify the new agent
    IF v_new_agent_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_new_agent_user_id,
        'coagent_assignment',
        '👥 Co-assignation client',
        'Vous avez été ajouté comme co-agent pour ' || COALESCE(v_client_name, 'un client'),
        '/agent/mes-clients',
        jsonb_build_object('client_id', NEW.client_id::text)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_coagent_added ON client_agents;

-- Create trigger
CREATE TRIGGER trigger_notify_coagent_added
AFTER INSERT ON client_agents
FOR EACH ROW
EXECUTE FUNCTION notify_on_coagent_added();