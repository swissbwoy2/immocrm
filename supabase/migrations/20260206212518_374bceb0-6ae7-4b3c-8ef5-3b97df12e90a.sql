
-- 1. Update the trigger function to create transactions at attente_bail stage
CREATE OR REPLACE FUNCTION public.create_transaction_on_cles_remises()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  -- CASE 1: Status changes to attente_bail -> create transaction with statut 'en_cours'
  IF NEW.statut = 'attente_bail' AND (OLD.statut IS NULL OR OLD.statut != 'attente_bail') THEN
    
    SELECT id INTO v_existing_transaction
    FROM transactions
    WHERE offre_id = NEW.offre_id AND client_id = NEW.client_id;
    
    IF v_existing_transaction IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    SELECT * INTO v_offre FROM offres WHERE id = NEW.offre_id;
    IF v_offre IS NULL THEN
      RAISE WARNING 'Offre not found for candidature %', NEW.id;
      RETURN NEW;
    END IF;
    
    SELECT * INTO v_client FROM clients WHERE id = NEW.client_id;
    IF v_client IS NULL THEN
      RAISE WARNING 'Client not found for candidature %', NEW.id;
      RETURN NEW;
    END IF;
    
    v_agent_id := v_offre.agent_id;
    IF v_agent_id IS NULL THEN
      v_agent_id := v_client.agent_id;
    END IF;
    
    v_commission_totale := COALESCE(v_offre.prix, 0);
    v_montant_total := v_commission_totale;
    v_split_agent := COALESCE(v_client.commission_split, 45);
    v_part_agent := ROUND(v_commission_totale * v_split_agent / 100, 2);
    v_part_agence := v_commission_totale - v_part_agent;
    
    INSERT INTO transactions (
      client_id, agent_id, offre_id, type_transaction,
      montant_total, commission_totale, part_agent, part_agence,
      statut, date_transaction, notes_internes
    ) VALUES (
      NEW.client_id, v_agent_id, NEW.offre_id, 'location',
      v_montant_total, v_commission_totale, v_part_agent, v_part_agence,
      'en_cours', now(), 'Transaction créée automatiquement - Dossier validé par la régie'
    );
    
    RETURN NEW;
  END IF;

  -- CASE 2: cles_remises changes to true -> update existing transaction to 'conclue' or create one
  IF NEW.cles_remises = true AND (OLD.cles_remises IS NULL OR OLD.cles_remises = false) THEN
    
    SELECT id INTO v_existing_transaction
    FROM transactions
    WHERE offre_id = NEW.offre_id AND client_id = NEW.client_id;
    
    IF v_existing_transaction IS NOT NULL THEN
      UPDATE transactions
      SET statut = 'conclue', updated_at = now()
      WHERE id = v_existing_transaction;
      RETURN NEW;
    END IF;
    
    SELECT * INTO v_offre FROM offres WHERE id = NEW.offre_id;
    IF v_offre IS NULL THEN
      RAISE WARNING 'Offre not found for candidature %', NEW.id;
      RETURN NEW;
    END IF;
    
    SELECT * INTO v_client FROM clients WHERE id = NEW.client_id;
    IF v_client IS NULL THEN
      RAISE WARNING 'Client not found for candidature %', NEW.id;
      RETURN NEW;
    END IF;
    
    v_agent_id := v_offre.agent_id;
    IF v_agent_id IS NULL THEN
      v_agent_id := v_client.agent_id;
    END IF;
    
    v_commission_totale := COALESCE(v_offre.prix, 0);
    v_montant_total := v_commission_totale;
    v_split_agent := COALESCE(v_client.commission_split, 45);
    v_part_agent := ROUND(v_commission_totale * v_split_agent / 100, 2);
    v_part_agence := v_commission_totale - v_part_agent;
    
    INSERT INTO transactions (
      client_id, agent_id, offre_id, type_transaction,
      montant_total, commission_totale, part_agent, part_agence,
      statut, date_transaction, notes_internes
    ) VALUES (
      NEW.client_id, v_agent_id, NEW.offre_id, 'location',
      v_montant_total, v_commission_totale, v_part_agent, v_part_agence,
      'conclue', now(), 'Transaction créée automatiquement - Clés remises'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Insert the 5 missing transactions

-- Salah Benrabah - Simplon 45 - 1450 CHF
INSERT INTO transactions (client_id, agent_id, offre_id, type_transaction, montant_total, commission_totale, part_agent, part_agence, statut, date_transaction, notes_internes)
VALUES (
  '5cdb9a06-fcf6-4a5f-adff-b30dba29f80a',
  'a2e35a1d-6f79-464b-b2fd-5aa846ca1d26',
  'afef7e8f-6e07-457d-abd0-0f51e5094e25',
  'location', 1450, 1450, 652.50, 797.50,
  'en_cours', now(), 'Rattrapage - Simplon 45'
);

-- Aziz Ed_Dahimi - Morges 11 - 1310 CHF
INSERT INTO transactions (client_id, agent_id, offre_id, type_transaction, montant_total, commission_totale, part_agent, part_agence, statut, date_transaction, notes_internes)
VALUES (
  'db573a3c-7794-4b65-86ce-fe9270b9e03f',
  '10747a45-5131-4036-8cec-2ec6f86d499f',
  '7787d818-d3e6-4891-9493-f7f31e326e9e',
  'location', 1310, 1310, 589.50, 720.50,
  'en_cours', now(), 'Rattrapage - Morges 11'
);

-- Mohamed Hilal - Chomaz 2 - 1800 CHF
INSERT INTO transactions (client_id, agent_id, offre_id, type_transaction, montant_total, commission_totale, part_agent, part_agence, statut, date_transaction, notes_internes)
VALUES (
  '22232c0b-dd63-4a52-bb00-649221770910',
  '10747a45-5131-4036-8cec-2ec6f86d499f',
  '02df1724-d79a-4fbc-889a-9193c89d74cc',
  'location', 1800, 1800, 810.00, 990.00,
  'en_cours', now(), 'Rattrapage - Chomaz 2'
);

-- Miguel Angel Lloret Robles - Morges 11 - 1310 CHF
INSERT INTO transactions (client_id, agent_id, offre_id, type_transaction, montant_total, commission_totale, part_agent, part_agence, statut, date_transaction, notes_internes)
VALUES (
  '07526262-f7f3-4a99-afb4-80d51416352d',
  '10747a45-5131-4036-8cec-2ec6f86d499f',
  '7787d818-d3e6-4891-9493-f7f31e326e9e',
  'location', 1310, 1310, 589.50, 720.50,
  'en_cours', now(), 'Rattrapage - Morges 11'
);

-- Mongi Tayahi - Vallombreuse 81 - 1590 CHF
INSERT INTO transactions (client_id, agent_id, offre_id, type_transaction, montant_total, commission_totale, part_agent, part_agence, statut, date_transaction, notes_internes)
VALUES (
  '56464fd2-d195-418b-8545-b4fc7ffdf593',
  '10747a45-5131-4036-8cec-2ec6f86d499f',
  '599af580-d2d7-49ee-81d4-47f64d937b40',
  'location', 1590, 1590, 715.50, 874.50,
  'en_cours', now(), 'Rattrapage - Vallombreuse 81'
);
