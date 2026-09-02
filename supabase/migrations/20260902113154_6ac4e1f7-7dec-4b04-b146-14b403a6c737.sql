CREATE TABLE IF NOT EXISTS public.broadcast_campaign_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text NOT NULL,
  user_id uuid NOT NULL,
  ticket_id uuid,
  email_status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_key, user_id)
);

GRANT SELECT ON public.broadcast_campaign_log TO authenticated;
GRANT ALL ON public.broadcast_campaign_log TO service_role;

ALTER TABLE public.broadcast_campaign_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bcl_admin_select" ON public.broadcast_campaign_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));