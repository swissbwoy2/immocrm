-- Modifier le trigger pour utiliser client_agents.commission_split
CREATE OR REPLACE FUNCTION public.create_transaction_on_cles_remises()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_offre RECORD;
  v_client RECORD;
  v_agent_id UUID;
  v_commission_totale NUMERIC;
  v_split_agent NUMERIC;
  v_part_agent NUMERIC;
  v_part_agence NUMERIC;
  v_montant_total NUMERIC;
  v_existing_transaction UUID;
BEGIN
  -- Only trigger when cles_remises changes from false/null to true
  IF NEW.cles_remises = true AND (OLD.cles_remises IS NULL OR OLD.cles_remises = false) THEN
    
    -- Check if a transaction already exists for this offer
    SELECT id INTO v_existing_transaction
    FROM transactions
    WHERE offre_id = NEW.offre_id;
    
    -- If transaction already exists, skip
    IF v_existing_transaction IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get the offer details
    SELECT * INTO v_offre
    FROM offres
    WHERE id = NEW.offre_id;
    
    IF v_offre IS NULL THEN
      RAISE WARNING 'Offre not found for candidature %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get the client details
    SELECT * INTO v_client
    FROM clients
    WHERE id = NEW.client_id;
    
    IF v_client IS NULL THEN
      RAISE WARNING 'Client not found for candidature %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get agent_id from the offer (agent who sent the offer)
    v_agent_id := v_offre.agent_id;
    
    IF v_agent_id IS NULL THEN
      RAISE WARNING 'No agent found for candidature %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get commission_split from client_agents for this specific agent
    SELECT commission_split INTO v_split_agent
    FROM client_agents
    WHERE client_id = NEW.client_id
    AND agent_id = v_agent_id;
    
    -- If not found in client_agents, use default 50%
    v_split_agent := COALESCE(v_split_agent, 50);
    
    -- Calculate commission (1 month rent = commission)
    v_montant_total := COALESCE(v_offre.prix, 0) * 12; -- Annual rent
    v_commission_totale := COALESCE(v_offre.prix, 0); -- 1 month rent as commission
    v_part_agent := ROUND(v_commission_totale * (v_split_agent / 100));
    v_part_agence := v_commission_totale - v_part_agent;
    
    -- Create the transaction
    INSERT INTO transactions (
      client_id,
      agent_id,
      offre_id,
      montant_total,
      commission_totale,
      part_agent,
      part_agence,
      statut,
      date_transaction,
      adresse,
      surface,
      pieces,
      type_bien,
      etage
    ) VALUES (
      NEW.client_id,
      v_agent_id,
      NEW.offre_id,
      v_montant_total,
      v_commission_totale,
      v_part_agent,
      v_part_agence,
      'conclue',
      NOW(),
      v_offre.adresse,
      v_offre.surface,
      v_offre.pieces,
      v_offre.type_bien,
      v_offre.etage
    );
    
    RAISE NOTICE 'Transaction created for candidature with commission and split for agent';
  END IF;
  
  RETURN NEW;
END;
$function$;