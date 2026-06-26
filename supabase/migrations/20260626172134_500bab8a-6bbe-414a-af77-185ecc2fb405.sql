ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS commentaire_admin text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;