-- Corriger le type de la colonne pieces pour supporter les valeurs décimales
ALTER TABLE public.offres 
ALTER COLUMN pieces TYPE NUMERIC;