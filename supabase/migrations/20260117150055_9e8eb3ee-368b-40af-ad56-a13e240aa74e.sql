-- Phase 1: Ajouter les colonnes de prix sur immeubles
ALTER TABLE immeubles ADD COLUMN IF NOT EXISTS prix_vendeur NUMERIC;
ALTER TABLE immeubles ADD COLUMN IF NOT EXISTS prix_commercial NUMERIC;
ALTER TABLE immeubles ADD COLUMN IF NOT EXISTS commission_agence_prevue NUMERIC;
ALTER TABLE immeubles ADD COLUMN IF NOT EXISTS places_parc_incluses BOOLEAN DEFAULT true;

-- Phase 2: Ajouter les colonnes sur transactions pour le mode vente
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type_transaction TEXT DEFAULT 'location';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS prix_vendeur_transaction NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS prix_vente_final NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_mode TEXT DEFAULT 'pourcentage';

-- Commentaires pour documentation
COMMENT ON COLUMN immeubles.prix_vendeur IS 'Prix net souhaité par le vendeur - CACHÉ aux acheteurs';
COMMENT ON COLUMN immeubles.prix_commercial IS 'Prix affiché aux acheteurs (prix_vendeur + marge agence)';
COMMENT ON COLUMN immeubles.commission_agence_prevue IS 'Commission prévue = prix_commercial - prix_vendeur';
COMMENT ON COLUMN immeubles.places_parc_incluses IS 'Si les places de parking sont incluses dans le prix';
COMMENT ON COLUMN transactions.type_transaction IS 'Type: location ou vente';
COMMENT ON COLUMN transactions.commission_mode IS 'Mode: marge (vente) ou pourcentage (location)';