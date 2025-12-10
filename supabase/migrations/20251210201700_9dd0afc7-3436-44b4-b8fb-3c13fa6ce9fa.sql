-- Add new columns to leads table for qualification
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prenom text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS telephone text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS statut_emploi text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS permis_nationalite text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS poursuites boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS a_garant boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_qualified boolean DEFAULT false;