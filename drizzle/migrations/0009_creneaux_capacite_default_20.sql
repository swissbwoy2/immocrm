ALTER TABLE public.annonce_creneaux ALTER COLUMN capacite_max SET DEFAULT 20;
UPDATE public.annonce_creneaux SET capacite_max = 20 WHERE capacite_max IS NULL;