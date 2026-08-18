ALTER TABLE public.formulaire_champs ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'principal';
DO $$ BEGIN
  ALTER TABLE public.formulaire_champs ADD CONSTRAINT formulaire_champs_section_check CHECK (section IN ('principal','conjoint','garant','bien','contact','signature'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.formulaires_location ADD COLUMN IF NOT EXISTS calibrated_at timestamptz;