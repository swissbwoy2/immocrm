
ALTER TABLE public.lead_email_logs
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opens_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicks_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_click_url TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_email_logs_recipient ON public.lead_email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_lead_email_logs_lead_id ON public.lead_email_logs(lead_id);

-- RPC publique pour incrémenter les ouvertures (appelée par edge function publique sans JWT)
CREATE OR REPLACE FUNCTION public.track_email_open(_log_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lead_email_logs
  SET
    opens_count = opens_count + 1,
    last_opened_at = now(),
    opened_at = COALESCE(opened_at, now()),
    delivered_at = COALESCE(delivered_at, now())
  WHERE id = _log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_email_click(_log_id UUID, _url TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lead_email_logs
  SET
    clicks_count = clicks_count + 1,
    last_clicked_at = now(),
    clicked_at = COALESCE(clicked_at, now()),
    last_click_url = _url,
    opened_at = COALESCE(opened_at, now()),
    last_opened_at = COALESCE(last_opened_at, now()),
    delivered_at = COALESCE(delivered_at, now())
  WHERE id = _log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_email_open(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_email_click(UUID, TEXT) TO anon, authenticated;
