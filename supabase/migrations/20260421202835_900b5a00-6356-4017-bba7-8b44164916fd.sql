
CREATE TABLE public.lead_phone_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  prospect_email text NOT NULL,
  prospect_phone text NOT NULL,
  prospect_name text NOT NULL,
  slot_start timestamptz NOT NULL,
  slot_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'en_attente',
  confirmed_by uuid,
  confirmed_at timestamptz,
  ics_sent_at timestamptz,
  notes_admin text,
  source_form text NOT NULL DEFAULT 'analyse_dossier',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX lead_phone_appointments_slot_unique_active
  ON public.lead_phone_appointments (slot_start)
  WHERE status <> 'annule';

CREATE INDEX lead_phone_appointments_slot_start_idx ON public.lead_phone_appointments (slot_start);
CREATE INDEX lead_phone_appointments_status_idx ON public.lead_phone_appointments (status);
CREATE INDEX lead_phone_appointments_lead_id_idx ON public.lead_phone_appointments (lead_id);

CREATE TRIGGER lead_phone_appointments_updated_at
BEFORE UPDATE ON public.lead_phone_appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lead_phone_appointments ENABLE ROW LEVEL SECURITY;

-- Public anon can insert (prospect not logged in)
CREATE POLICY "Public can book phone appointments"
ON public.lead_phone_appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins full access
CREATE POLICY "Admins can view phone appointments"
ON public.lead_phone_appointments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update phone appointments"
ON public.lead_phone_appointments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete phone appointments"
ON public.lead_phone_appointments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Public view: only slot_start + status (to grey out taken slots)
CREATE OR REPLACE VIEW public.available_phone_slots
WITH (security_invoker = true) AS
SELECT slot_start, status
FROM public.lead_phone_appointments
WHERE status <> 'annule'
  AND slot_start >= now();

GRANT SELECT ON public.available_phone_slots TO anon, authenticated;

-- Allow public to read the view via a permissive RLS-equivalent policy on base table for the limited columns
-- Since security_invoker uses caller's perms, we add a SELECT policy restricted to slot_start/status purpose:
CREATE POLICY "Public can read slot availability"
ON public.lead_phone_appointments
FOR SELECT
TO anon, authenticated
USING (status <> 'annule' AND slot_start >= now());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_phone_appointments;
