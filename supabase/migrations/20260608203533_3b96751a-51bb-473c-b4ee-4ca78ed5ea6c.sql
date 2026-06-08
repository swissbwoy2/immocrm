CREATE TABLE public.cookie_consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  categories JSONB NOT NULL,
  policy_version TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'banner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cookie_consent_logs TO authenticated;
GRANT INSERT ON public.cookie_consent_logs TO anon;
GRANT ALL ON public.cookie_consent_logs TO service_role;

ALTER TABLE public.cookie_consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert consent log"
ON public.cookie_consent_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read consent logs"
ON public.cookie_consent_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cookie_consent_logs_user_id ON public.cookie_consent_logs(user_id);
CREATE INDEX idx_cookie_consent_logs_anonymous_id ON public.cookie_consent_logs(anonymous_id);
CREATE INDEX idx_cookie_consent_logs_created_at ON public.cookie_consent_logs(created_at DESC);