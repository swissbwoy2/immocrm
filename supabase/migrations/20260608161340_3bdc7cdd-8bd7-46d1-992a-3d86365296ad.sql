ALTER TABLE public.lead_phone_appointments ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lead_phone_appointments_assigned_agent ON public.lead_phone_appointments(assigned_agent_id);

DROP POLICY IF EXISTS "Assigned agents can view their phone appointments" ON public.lead_phone_appointments;
CREATE POLICY "Assigned agents can view their phone appointments"
ON public.lead_phone_appointments
FOR SELECT
TO authenticated
USING (assigned_agent_id = auth.uid());