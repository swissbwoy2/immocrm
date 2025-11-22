-- Modifier le type de la colonne pieces dans la table offres pour permettre les valeurs décimales
ALTER TABLE public.offres 
ALTER COLUMN pieces TYPE numeric USING pieces::numeric;

-- Modifier également le type dans la table clients pour la cohérence
ALTER TABLE public.clients 
ALTER COLUMN pieces TYPE numeric USING pieces::numeric;

ALTER TABLE public.clients 
ALTER COLUMN pieces_actuel TYPE numeric USING pieces_actuel::numeric;