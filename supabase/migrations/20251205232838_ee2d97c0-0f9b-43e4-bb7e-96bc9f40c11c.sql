-- Corriger le search_path de la fonction pour la sécurité
CREATE OR REPLACE FUNCTION calculate_referral_commission()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.montant_frais_agence IS NOT NULL AND 
     (OLD.montant_frais_agence IS NULL OR OLD.montant_frais_agence IS DISTINCT FROM NEW.montant_frais_agence) THEN
    NEW.montant_commission := NEW.montant_frais_agence * (COALESCE(NEW.taux_commission, 10) / 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;