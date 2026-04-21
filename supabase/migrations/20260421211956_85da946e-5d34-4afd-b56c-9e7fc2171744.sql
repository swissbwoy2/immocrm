ALTER TABLE public.lead_phone_appointments
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_phone_appt_reminder_pending
  ON public.lead_phone_appointments (slot_start)
  WHERE status = 'confirme' AND reminder_24h_sent_at IS NULL;