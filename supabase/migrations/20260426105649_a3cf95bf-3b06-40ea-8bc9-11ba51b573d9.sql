-- Ajout colonnes sur clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS refund_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS mandate_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS mandate_pause_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mandate_official_end_date date;

-- Contraintes valeurs autorisées
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_cancellation_reason_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_cancellation_reason_check
      CHECK (cancellation_reason IS NULL OR cancellation_reason IN ('found_alone', 'not_searching_anymore', 'searching_alone'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_refund_status_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_refund_status_check
      CHECK (refund_status IN ('not_applicable', 'pending', 'processed'));
  END IF;
END $$;

-- Ajout colonnes sur mandate_renewal_actions
ALTER TABLE public.mandate_renewal_actions
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS refund_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS days_since_signature integer;

-- Mettre à jour la contrainte d'action si elle existe (pour ajouter nouvelles valeurs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mandate_renewal_actions_action_check'
  ) THEN
    ALTER TABLE public.mandate_renewal_actions DROP CONSTRAINT mandate_renewal_actions_action_check;
  END IF;
  ALTER TABLE public.mandate_renewal_actions
    ADD CONSTRAINT mandate_renewal_actions_action_check
    CHECK (action IN ('renewed', 'cancelled', 'cancelled_with_refund', 'auto_renewed', 'paused', 'resumed'));
END $$;

-- Backfill mandate_official_end_date pour clients existants ayant signé un mandat
UPDATE public.clients
SET mandate_official_end_date = (mandat_date_signature::date + INTERVAL '90 days')::date
WHERE mandat_date_signature IS NOT NULL AND mandate_official_end_date IS NULL;

-- Index utile pour la cron
CREATE INDEX IF NOT EXISTS idx_clients_refund_status ON public.clients(refund_status) WHERE refund_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_clients_mandate_paused ON public.clients(mandate_paused_at) WHERE mandate_paused_at IS NOT NULL;