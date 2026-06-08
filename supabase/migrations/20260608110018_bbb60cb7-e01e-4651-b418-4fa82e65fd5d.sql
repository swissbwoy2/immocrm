ALTER TABLE public.lead_phone_appointments ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'telephonique';

UPDATE public.lead_phone_appointments
SET appointment_type = 'bureau'
WHERE source_form = 'rdv_bureau_crissier' AND appointment_type <> 'bureau';

ALTER TABLE public.lead_phone_appointments
  ADD CONSTRAINT lead_phone_appointments_appointment_type_check
  CHECK (appointment_type IN ('bureau', 'telephonique'));