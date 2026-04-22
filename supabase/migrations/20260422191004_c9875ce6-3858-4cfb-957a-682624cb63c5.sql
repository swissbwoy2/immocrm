-- Allow anon to link lead_id once on lead_phone_appointments
DROP POLICY IF EXISTS "anon can link lead_id once" ON public.lead_phone_appointments;
CREATE POLICY "anon can link lead_id once"
ON public.lead_phone_appointments
FOR UPDATE
TO anon
USING (lead_id IS NULL)
WITH CHECK (lead_id IS NOT NULL);

-- One-time backfill: link existing rows to leads via prospect_email
UPDATE public.lead_phone_appointments lpa
SET lead_id = l.id
FROM public.leads l
WHERE lpa.lead_id IS NULL
  AND lpa.prospect_email IS NOT NULL
  AND lower(l.email) = lower(lpa.prospect_email);
