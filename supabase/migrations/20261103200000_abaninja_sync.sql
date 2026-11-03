-- Synchronisation AbaNinja → Logisorama
-- 1. Les acomptes peuvent être « en attente » (facture envoyée, pas encore réglée).
-- 2. Chaque acompte garde le lien vers sa facture AbaNinja.
-- 3. Copie locale des factures AbaNinja + journal de chaque synchronisation.
-- 4. Synchronisation automatique toutes les heures.

-- 1. Statut « en_attente »
ALTER TABLE public.acomptes DROP CONSTRAINT IF EXISTS acomptes_statut_check;
ALTER TABLE public.acomptes
  ADD CONSTRAINT acomptes_statut_check CHECK (statut IN ('en_attente', 'paye', 'acquis', 'ristourne'));

-- 2. Lien vers la facture
ALTER TABLE public.acomptes ADD COLUMN IF NOT EXISTS abaninja_invoice_id text;
ALTER TABLE public.acomptes ADD COLUMN IF NOT EXISTS abaninja_invoice_number text;
CREATE INDEX IF NOT EXISTS acomptes_abaninja_invoice_id_idx ON public.acomptes (abaninja_invoice_id);
CREATE INDEX IF NOT EXISTS acomptes_abaninja_invoice_number_idx ON public.acomptes (abaninja_invoice_number);

-- Reprise : numéro de facture écrit dans les notes (« Facture AbaNinja RE-00123 … »)
UPDATE public.acomptes
   SET abaninja_invoice_number = substring(notes from 'Facture AbaNinja ([A-Za-z0-9][A-Za-z0-9_-]*)')
 WHERE abaninja_invoice_number IS NULL
   AND notes ~ 'Facture AbaNinja [A-Za-z0-9]';

-- 3. Copie locale des factures
CREATE TABLE IF NOT EXISTS public.abaninja_invoices (
  uuid text PRIMARY KEY,
  invoice_number text,
  reference text,
  title text,
  status text,
  sent_status text,
  document_total numeric,
  open_amount numeric,
  est_payee boolean NOT NULL DEFAULT false,
  is_cancelled boolean NOT NULL DEFAULT false,
  receiver_name text,
  receiver_email text,
  invoice_date date,
  due_date date,
  aba_updated_at timestamptz,
  payee_detectee_le timestamptz,
  demande_mandat_id uuid REFERENCES public.demandes_mandat(id) ON DELETE SET NULL,
  acompte_id uuid REFERENCES public.acomptes(id) ON DELETE SET NULL,
  raw jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS abaninja_invoices_number_idx ON public.abaninja_invoices (invoice_number);
CREATE INDEX IF NOT EXISTS abaninja_invoices_email_idx ON public.abaninja_invoices (lower(receiver_email));

CREATE TABLE IF NOT EXISTS public.abaninja_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'cron',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  ok boolean,
  factures_lues integer DEFAULT 0,
  corrections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ecarts jsonb NOT NULL DEFAULT '[]'::jsonb,
  erreur text
);
CREATE INDEX IF NOT EXISTS abaninja_sync_runs_started_idx ON public.abaninja_sync_runs (started_at DESC);

ALTER TABLE public.abaninja_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abaninja_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins lisent les factures AbaNinja" ON public.abaninja_invoices;
CREATE POLICY "Admins lisent les factures AbaNinja" ON public.abaninja_invoices
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins lisent le journal de synchro AbaNinja" ON public.abaninja_sync_runs;
CREATE POLICY "Admins lisent le journal de synchro AbaNinja" ON public.abaninja_sync_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Toutes les heures (minute 17)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'abaninja-sync-hourly') THEN
    PERFORM cron.unschedule('abaninja-sync-hourly');
  END IF;
  PERFORM cron.schedule('abaninja-sync-hourly', '17 * * * *',
    $cmd$SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/abaninja-sync', headers := private.edge_service_headers(), body := '{"source":"cron"}'::jsonb, timeout_milliseconds := 120000);$cmd$);
END;
$$;
