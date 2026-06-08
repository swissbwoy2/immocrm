ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS statut_suisse text,
  ADD COLUMN IF NOT EXISTS situation_pro text,
  ADD COLUMN IF NOT EXISTS poursuites_statut text,
  ADD COLUMN IF NOT EXISTS nb_pieces text,
  ADD COLUMN IF NOT EXISTS localite_recherche text,
  ADD COLUMN IF NOT EXISTS budget_max_chf numeric,
  ADD COLUMN IF NOT EXISTS revenu_net_mensuel_chf numeric,
  ADD COLUMN IF NOT EXISTS ratio_revenu_loyer numeric,
  ADD COLUMN IF NOT EXISTS statut_qualification text,
  ADD COLUMN IF NOT EXISTS risque_niveau text,
  ADD COLUMN IF NOT EXISTS motif_qualification text,
  ADD COLUMN IF NOT EXISTS resume_profil text,
  ADD COLUMN IF NOT EXISTS recommandation_agent text,
  ADD COLUMN IF NOT EXISTS requires_manual_validation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_statut_qualification ON public.leads(statut_qualification);
CREATE INDEX IF NOT EXISTS idx_leads_requires_manual_validation ON public.leads(requires_manual_validation) WHERE requires_manual_validation = true;