ALTER TABLE public.offres
  ADD COLUMN IF NOT EXISTS contact_gerance text,
  ADD COLUMN IF NOT EXISTS contact_annonceur text,
  ADD COLUMN IF NOT EXISTS contact_visite text;