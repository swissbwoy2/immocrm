-- Modifier les défauts des colonnes apporteurs (10% sans minimum)
ALTER TABLE apporteurs ALTER COLUMN taux_commission SET DEFAULT 10;
ALTER TABLE apporteurs ALTER COLUMN minimum_vente SET DEFAULT 0;
ALTER TABLE apporteurs ALTER COLUMN minimum_location SET DEFAULT 0;

-- Mettre à jour les apporteurs existants
UPDATE apporteurs SET taux_commission = 10, minimum_vente = 0, minimum_location = 0;

-- Modifier les défauts des colonnes referrals  
ALTER TABLE referrals ALTER COLUMN taux_commission SET DEFAULT 10;
UPDATE referrals SET taux_commission = 10 WHERE taux_commission = 20 OR taux_commission IS NULL;

-- Créer ou remplacer la fonction pour calculer la commission automatiquement à 10%
CREATE OR REPLACE FUNCTION calculate_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.montant_frais_agence IS NOT NULL AND 
     (OLD.montant_frais_agence IS NULL OR OLD.montant_frais_agence IS DISTINCT FROM NEW.montant_frais_agence) THEN
    NEW.montant_commission := NEW.montant_frais_agence * (COALESCE(NEW.taux_commission, 10) / 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe et le recréer
DROP TRIGGER IF EXISTS trigger_calculate_referral_commission ON referrals;
CREATE TRIGGER trigger_calculate_referral_commission
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_referral_commission();