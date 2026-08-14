ALTER TABLE public.annonces_publiques
  ADD COLUMN IF NOT EXISTS date_mise_en_avant_debut timestamptz,
  ADD COLUMN IF NOT EXISTS date_mise_en_avant_fin timestamptz;

ALTER TABLE public.annonces_publiques ALTER COLUMN duree_publication SET DEFAULT 60;

ALTER TABLE public.annonces_publiques DROP CONSTRAINT IF EXISTS annonces_publiques_sous_type_check;
ALTER TABLE public.annonces_publiques ADD CONSTRAINT annonces_publiques_sous_type_check
  CHECK (sous_type IS NULL OR sous_type = ANY (ARRAY[
    'appartement','maison','studio','loft','villa','chalet','terrain','commerce','bureau','parking',
    'attique','duplex','entrepot','location_longue','location_courte','colocation','sous_location'
  ]));

CREATE INDEX IF NOT EXISTS idx_annonces_publiques_statut_soumission
  ON public.annonces_publiques (statut, date_soumission DESC);