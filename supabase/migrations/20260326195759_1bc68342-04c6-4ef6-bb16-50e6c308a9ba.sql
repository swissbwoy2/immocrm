
-- Update trigger to also mark transaction as 'conclue' when signature_effectuee becomes true
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
      'conclue', now(), 'Transaction créée automatiquement à la remise des clés'
    );

    RETURN NEW;
  END IF;

  -- CASE 3: signature_effectuee changes to true -> update existing transaction to 'conclue'
  IF NEW.signature_effectuee = true AND (OLD.signature_effectuee IS NULL OR OLD.signature_effectuee = false) THEN

    UPDATE transactions
    SET statut = 'conclue', updated_at = now()
    WHERE offre_id = NEW.offre_id AND client_id = NEW.client_id AND statut = 'en_cours';

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- Catch-up: update existing transactions where signature was already done
UPDATE transactions t
SET statut = 'conclue', updated_at = now()
FROM candidatures c
WHERE t.offre_id = c.offre_id
  AND t.client_id = c.client_id
  AND c.signature_effectuee = true
  AND t.statut = 'en_cours';
