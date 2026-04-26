-- Ajout colonnes suivi extrait de poursuites
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS extrait_poursuites_date_emission DATE,
  ADD COLUMN IF NOT EXISTS extrait_poursuites_extraction_method TEXT,
  ADD COLUMN IF NOT EXISTS extrait_poursuites_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extrait_poursuites_last_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extrait_poursuites_ai_confidence NUMERIC;

-- Contrainte sur méthode
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_poursuites_extraction_method_check') THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_poursuites_extraction_method_check
      CHECK (extrait_poursuites_extraction_method IS NULL OR extrait_poursuites_extraction_method IN ('ai', 'manual', 'agent'));
  END IF;
END $$;

-- Index pour les requêtes du cron de rappel
CREATE INDEX IF NOT EXISTS idx_clients_poursuites_emission
  ON public.clients(extrait_poursuites_date_emission)
  WHERE extrait_poursuites_date_emission IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_poursuites_last_reminder
  ON public.clients(extrait_poursuites_last_reminder_at)
  WHERE extrait_poursuites_last_reminder_at IS NOT NULL;