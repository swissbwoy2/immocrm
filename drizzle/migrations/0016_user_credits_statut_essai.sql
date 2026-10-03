DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='public.user_credits'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%mandat_statut%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.user_credits DROP CONSTRAINT %I', c); END IF;
END $$;
ALTER TABLE public.user_credits ADD CONSTRAINT user_credits_mandat_statut_check CHECK (mandat_statut = ANY (ARRAY['actif','suspendu','resilie','essai']));