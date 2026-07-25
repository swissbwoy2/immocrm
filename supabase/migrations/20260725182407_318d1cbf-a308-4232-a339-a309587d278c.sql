ALTER TABLE public.offres ADD COLUMN IF NOT EXISTS envoi_auto BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_offres_envoi_auto ON public.offres(envoi_auto) WHERE envoi_auto = true;