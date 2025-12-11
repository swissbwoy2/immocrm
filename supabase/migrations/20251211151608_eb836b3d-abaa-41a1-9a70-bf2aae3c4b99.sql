-- Ajouter la colonne source pour différencier l'origine des visites
ALTER TABLE public.visites 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'proposee_agent';

-- Mettre à jour les visites existantes déléguées
UPDATE public.visites 
SET source = 'deleguee' 
WHERE est_deleguee = true AND (source IS NULL OR source = 'proposee_agent');

-- Mettre à jour les visites confirmées (statut confirmee ou effectuee)
UPDATE public.visites 
SET source = 'planifiee_client' 
WHERE est_deleguee = false AND statut IN ('confirmee', 'effectuee') AND source = 'proposee_agent';

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_visites_source ON public.visites(source);

-- Commentaire sur la colonne
COMMENT ON COLUMN public.visites.source IS 'Origine de la visite: proposee_agent (créneau proposé), planifiee_client (confirmée par client), deleguee (déléguée à l''agent)';