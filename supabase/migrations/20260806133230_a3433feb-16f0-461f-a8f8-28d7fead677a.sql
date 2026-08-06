ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'automation_operator';

CREATE TABLE public.automation_auth_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  outcome text NOT NULL CHECK (outcome IN ('granted','denied','rate_limited'))
);
GRANT ALL ON public.automation_auth_log TO service_role;
ALTER TABLE public.automation_auth_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read automation auth log"
ON public.automation_auth_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.automation_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  bot_user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.automation_login_codes TO service_role;
ALTER TABLE public.automation_login_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_automation_auth_log_ip_created ON public.automation_auth_log (ip, created_at DESC);
CREATE INDEX idx_automation_login_codes_expires ON public.automation_login_codes (expires_at);