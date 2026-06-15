-- 1) signup_attempts table
CREATE TABLE public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  first_name text,
  last_name text,
  source text,
  parcours text,
  stage text NOT NULL CHECK (stage IN ('auth_signup_failed','provision_failed','succeeded','lead_only')),
  error_message text,
  user_agent text,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_attempts_created_at ON public.signup_attempts(created_at DESC);
CREATE INDEX idx_signup_attempts_stage ON public.signup_attempts(stage);
CREATE INDEX idx_signup_attempts_email ON public.signup_attempts(lower(email));

GRANT SELECT, UPDATE ON public.signup_attempts TO authenticated;
GRANT ALL ON public.signup_attempts TO service_role;

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read signup_attempts"
  ON public.signup_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update signup_attempts"
  ON public.signup_attempts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Backfill missing clients rows for users with client role but no clients entry
INSERT INTO public.clients (user_id, date_ajout, statut, priorite)
SELECT ur.user_id, now(), 'actif', 'moyenne'
FROM public.user_roles ur
LEFT JOIN public.clients c ON c.user_id = ur.user_id
WHERE ur.role = 'client' AND c.id IS NULL
ON CONFLICT (user_id) DO NOTHING;