-- Ajout des nouvelles colonnes à la table transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS adresse text,
ADD COLUMN IF NOT EXISTS surface numeric,
ADD COLUMN IF NOT EXISTS pieces numeric,
ADD COLUMN IF NOT EXISTS type_bien text,
ADD COLUMN IF NOT EXISTS etage text,
ADD COLUMN IF NOT EXISTS regie_nom text,
ADD COLUMN IF NOT EXISTS regie_contact text,
ADD COLUMN IF NOT EXISTS regie_telephone text,
ADD COLUMN IF NOT EXISTS regie_email text,
ADD COLUMN IF NOT EXISTS date_debut_bail date,
ADD COLUMN IF NOT EXISTS date_etat_lieux timestamptz,
ADD COLUMN IF NOT EXISTS etat_lieux_confirme boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notes_internes text;