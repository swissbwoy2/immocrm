-- Ajouter des colonnes pour les visites déléguées et feedback
ALTER TABLE public.visites
ADD COLUMN est_deleguee boolean DEFAULT false,
ADD COLUMN feedback_agent text,
ADD COLUMN recommandation_agent text CHECK (recommandation_agent IN ('recommande', 'neutre', 'deconseille'));

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX idx_visites_deleguees ON public.visites(est_deleguee, agent_id, statut);