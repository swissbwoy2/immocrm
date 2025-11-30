-- Drop the old check constraint
ALTER TABLE public.candidatures DROP CONSTRAINT IF EXISTS candidatures_statut_check;

-- Create new check constraint with all workflow statuses
ALTER TABLE public.candidatures ADD CONSTRAINT candidatures_statut_check 
CHECK (statut IN (
  'en_attente',
  'acceptee', 
  'refusee',
  'bail_conclu',
  'attente_bail',
  'bail_recu',
  'signature_planifiee',
  'signature_effectuee',
  'etat_lieux_fixe',
  'cles_remises'
));