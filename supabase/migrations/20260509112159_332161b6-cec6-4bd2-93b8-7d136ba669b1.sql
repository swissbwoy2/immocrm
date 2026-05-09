
ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_e164 text;
