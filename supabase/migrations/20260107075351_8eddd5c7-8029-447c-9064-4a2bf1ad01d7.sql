-- Ajouter les champs de suivi de paiement de commission
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS commission_payee BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_paiement_commission TIMESTAMP WITH TIME ZONE;