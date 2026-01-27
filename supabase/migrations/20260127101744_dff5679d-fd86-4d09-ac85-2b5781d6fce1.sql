-- Add date_visite_fin column to store end time of visits
ALTER TABLE public.visites ADD COLUMN date_visite_fin TIMESTAMPTZ;