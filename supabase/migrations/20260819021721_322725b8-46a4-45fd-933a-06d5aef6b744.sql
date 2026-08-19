CREATE UNIQUE INDEX IF NOT EXISTS idx_annonces_publiques_source_external
  ON public.annonces_publiques (source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;