
CREATE INDEX IF NOT EXISTS idx_offres_date_envoi_desc ON public.offres (date_envoi DESC);
CREATE INDEX IF NOT EXISTS idx_offres_statut ON public.offres (statut);
CREATE INDEX IF NOT EXISTS idx_visites_offre_id ON public.visites (offre_id);
