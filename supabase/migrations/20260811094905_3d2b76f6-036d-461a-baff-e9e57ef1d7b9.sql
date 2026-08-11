ALTER TABLE public.visite_comptes_rendus
  ADD COLUMN IF NOT EXISTS cuisine_type text,
  ADD COLUMN IF NOT EXISTS cuisine_description text,
  ADD COLUMN IF NOT EXISTS ascenseur boolean,
  ADD COLUMN IF NOT EXISTS balcon boolean,
  ADD COLUMN IF NOT EXISTS parking boolean;