-- Tracking du dernier rappel fiche de salaire
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS payslip_last_reminder_at TIMESTAMPTZ;

-- Index pour optimiser la lecture de la dernière fiche par client
CREATE INDEX IF NOT EXISTS idx_documents_client_payslip_recent
  ON public.documents(client_id, date_upload DESC)
  WHERE type_document = 'fiche_salaire';