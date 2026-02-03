-- Add AbaNinja reference columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS abaninja_client_uuid text,
ADD COLUMN IF NOT EXISTS abaninja_invoice_id text,
ADD COLUMN IF NOT EXISTS abaninja_invoice_ref text;

-- Add comments for documentation
COMMENT ON COLUMN public.clients.abaninja_client_uuid IS 'UUID du client dans AbaNinja';
COMMENT ON COLUMN public.clients.abaninja_invoice_id IS 'UUID de la facture dans AbaNinja';
COMMENT ON COLUMN public.clients.abaninja_invoice_ref IS 'Référence de la facture (ex: MANDAT-XXXX)';