-- Ajouter le champ type_recherche à la table clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS type_recherche text DEFAULT 'Louer';

-- Commentaire pour clarifier les valeurs attendues
COMMENT ON COLUMN public.clients.type_recherche IS 'Type de recherche: Louer ou Acheter';