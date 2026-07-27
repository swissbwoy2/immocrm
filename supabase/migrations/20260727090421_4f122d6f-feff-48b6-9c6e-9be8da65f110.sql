
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS relance_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS derniere_relance_at timestamptz;
