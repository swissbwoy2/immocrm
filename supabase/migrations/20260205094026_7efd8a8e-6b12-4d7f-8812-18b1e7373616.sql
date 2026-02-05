-- Add missing columns to leads table for the shortlist form
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS type_recherche text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS accord_bancaire boolean;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS apport_personnel text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS type_bien text;