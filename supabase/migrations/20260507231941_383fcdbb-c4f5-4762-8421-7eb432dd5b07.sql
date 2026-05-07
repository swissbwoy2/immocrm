
ALTER TABLE public.visites
  ADD COLUMN IF NOT EXISTS medias_coursier jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_decision text;

ALTER TABLE public.candidatures
  ADD COLUMN IF NOT EXISTS avis_google_clicked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_candidatures_offre_client
  ON public.candidatures(offre_id, client_id);
