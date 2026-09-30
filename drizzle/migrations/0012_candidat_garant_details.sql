ALTER TABLE public.candidat_criteres
  ADD COLUMN IF NOT EXISTS garant_nom text,
  ADD COLUMN IF NOT EXISTS garant_lien text,
  ADD COLUMN IF NOT EXISTS garant_revenus numeric,
  ADD COLUMN IF NOT EXISTS garant_permis text,
  ADD COLUMN IF NOT EXISTS garant_poursuites boolean,
  ADD COLUMN IF NOT EXISTS garant_actes_defaut boolean;