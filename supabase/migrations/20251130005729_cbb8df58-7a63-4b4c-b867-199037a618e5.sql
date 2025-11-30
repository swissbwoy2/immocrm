-- Add new columns to candidatures table for the complete workflow
ALTER TABLE public.candidatures 
ADD COLUMN IF NOT EXISTS client_accepte_conclure BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_accepte_conclure_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS agent_valide_regie BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agent_valide_regie_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bail_recu BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bail_recu_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dates_signature_proposees JSONB,
ADD COLUMN IF NOT EXISTS date_signature_choisie TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lieu_signature TEXT DEFAULT 'Chemin de l''Esparcette 5, 1023 Crissier',
ADD COLUMN IF NOT EXISTS signature_effectuee BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_effectuee_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS date_etat_lieux TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS heure_etat_lieux TEXT,
ADD COLUMN IF NOT EXISTS alerte_cles_vue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cles_remises BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cles_remises_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recommandation_envoyee BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avis_google_envoye BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS emails_recommandation JSONB DEFAULT '[]'::jsonb;

-- Update candidatures statut comment to document new statuses
COMMENT ON COLUMN public.candidatures.statut IS 'Statuts: en_attente, acceptee, refusee, bail_conclu, attente_bail, bail_recu, signature_planifiee, signature_effectuee, etat_lieux_fixe, cles_remises';