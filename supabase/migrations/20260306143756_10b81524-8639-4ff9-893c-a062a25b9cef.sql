
-- Add mode_remuneration to employes
ALTER TABLE public.employes ADD COLUMN IF NOT EXISTS mode_remuneration text NOT NULL DEFAULT 'commission';

-- Add columns to fiches_salaire
ALTER TABLE public.fiches_salaire ADD COLUMN IF NOT EXISTS mode_remuneration text NOT NULL DEFAULT 'commission';
ALTER TABLE public.fiches_salaire ADD COLUMN IF NOT EXISTS montant_commissions numeric DEFAULT 0;
ALTER TABLE public.fiches_salaire ADD COLUMN IF NOT EXISTS nombre_heures numeric DEFAULT 0;
ALTER TABLE public.fiches_salaire ADD COLUMN IF NOT EXISTS taux_horaire_utilise numeric DEFAULT 0;
ALTER TABLE public.fiches_salaire ADD COLUMN IF NOT EXISTS detail_commissions jsonb DEFAULT '[]'::jsonb;
