
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS anonymise_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymise_motif text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anonymise_at timestamptz;

CREATE TABLE IF NOT EXISTS public.client_anonymisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  user_id uuid NOT NULL,
  prenom text,
  nom text,
  email text,
  telephone text,
  adresse text,
  anonymise_at timestamptz NOT NULL DEFAULT now(),
  anonymise_par uuid,
  motif text DEFAULT 'Demande RGPD - droit à l''effacement (art. 17 RGPD / nLPD CH)',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_anonymisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins voient les anonymisations" ON public.client_anonymisations;
CREATE POLICY "Admins voient les anonymisations"
  ON public.client_anonymisations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins inserent les anonymisations" ON public.client_anonymisations;
CREATE POLICY "Admins inserent les anonymisations"
  ON public.client_anonymisations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_client_anonymisations_client_id ON public.client_anonymisations(client_id);
CREATE INDEX IF NOT EXISTS idx_client_anonymisations_user_id ON public.client_anonymisations(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_anonymise_at ON public.clients(anonymise_at) WHERE anonymise_at IS NOT NULL;
