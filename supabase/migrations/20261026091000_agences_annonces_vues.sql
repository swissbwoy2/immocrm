-- Mémoire de la routine « logisorama-agences » : liens des annonces déjà vues sur le site de chaque agence
-- (sert à reconnaître les nouvelles annonces quand le site n'affiche pas de date de publication).
ALTER TABLE public.agences_immobilieres
  ADD COLUMN IF NOT EXISTS annonces_vues jsonb NOT NULL DEFAULT '[]'::jsonb;
