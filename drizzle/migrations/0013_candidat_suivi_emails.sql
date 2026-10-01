CREATE TABLE IF NOT EXISTS public.candidat_suivi_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  creneau_id uuid NULL,
  etape text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidat_suivi_emails_uniq UNIQUE NULLS NOT DISTINCT (user_id, creneau_id, etape)
);
CREATE INDEX IF NOT EXISTS candidat_suivi_emails_user_sent_idx ON public.candidat_suivi_emails (user_id, sent_at DESC);
GRANT SELECT ON public.candidat_suivi_emails TO authenticated;
GRANT ALL ON public.candidat_suivi_emails TO service_role;
ALTER TABLE public.candidat_suivi_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin agent read candidat_suivi_emails" ON public.candidat_suivi_emails
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));