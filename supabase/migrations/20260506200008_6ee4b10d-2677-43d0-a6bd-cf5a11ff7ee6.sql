
CREATE TABLE IF NOT EXISTS public.whatsapp_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wa_pending_phone ON public.whatsapp_pending_actions(recipient_phone, expires_at) WHERE consumed_at IS NULL;

ALTER TABLE public.whatsapp_pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - pending actions"
  ON public.whatsapp_pending_actions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Generated stored column for date-based uniqueness (immutable)
ALTER TABLE public.whatsapp_notification_logs
  ADD COLUMN IF NOT EXISTS sent_date DATE
  GENERATED ALWAYS AS ((sent_at AT TIME ZONE 'UTC')::date) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_logs_unique_daily_send
  ON public.whatsapp_notification_logs(client_id, template_key, sent_date)
  WHERE status = 'sent' AND client_id IS NOT NULL AND sent_date IS NOT NULL;
