-- Add UTM tracking columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_term text;