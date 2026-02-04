-- Add columns for final invoice tracking on candidatures
ALTER TABLE public.candidatures
ADD COLUMN IF NOT EXISTS facture_finale_invoice_id text,
ADD COLUMN IF NOT EXISTS facture_finale_invoice_ref text,
ADD COLUMN IF NOT EXISTS facture_finale_montant numeric,
ADD COLUMN IF NOT EXISTS facture_finale_created_at timestamptz;