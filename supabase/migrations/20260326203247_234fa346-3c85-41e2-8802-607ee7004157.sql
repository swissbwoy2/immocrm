
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS date_changement_statut TIMESTAMPTZ;

-- Backfill: for clients already reloge/stoppe/suspendu, set date_changement_statut to updated_at
UPDATE public.clients 
SET date_changement_statut = updated_at 
WHERE statut IN ('reloge', 'stoppe', 'suspendu') 
AND date_changement_statut IS NULL;
