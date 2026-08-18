ALTER TABLE public.formulaires_location
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'overlay';

ALTER TABLE public.formulaires_location
  DROP CONSTRAINT IF EXISTS formulaires_location_mode_check;
ALTER TABLE public.formulaires_location
  ADD CONSTRAINT formulaires_location_mode_check CHECK (mode IN ('overlay','acroform'));

ALTER TABLE public.formulaire_champs
  ADD COLUMN IF NOT EXISTS nom_champ_pdf text,
  ADD COLUMN IF NOT EXISTS type_champ text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS option_valeur text;

ALTER TABLE public.formulaire_champs
  DROP CONSTRAINT IF EXISTS formulaire_champs_type_champ_check;
ALTER TABLE public.formulaire_champs
  ADD CONSTRAINT formulaire_champs_type_champ_check CHECK (type_champ IN ('text','checkbox','radio','dropdown','optionlist'));

CREATE INDEX IF NOT EXISTS idx_formulaire_champs_nom_pdf
  ON public.formulaire_champs (formulaire_id, nom_champ_pdf);