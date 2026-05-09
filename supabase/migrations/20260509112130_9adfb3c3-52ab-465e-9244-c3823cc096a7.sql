
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_e164 text;

CREATE INDEX IF NOT EXISTS idx_wa_logs_template_context_sent
  ON public.whatsapp_notification_logs (template_key, context_ref)
  WHERE status = 'sent';

INSERT INTO public.whatsapp_message_templates
  (template_key, template_name_meta, category, language, body_preview, variables_schema, is_active)
VALUES (
  'location_rdv_activation_v2',
  'logisorama_location_rdv_activation_v2',
  'MARKETING',
  'fr',
  'Bonjour {{1}}, 🏠 Tu cherches un appartement en Suisse romande ? RDV gratuit à Crissier ou activation en ligne.',
  '[{"key":"first_name_or_fallback","example":"V-Yael"}]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE
  SET template_name_meta = EXCLUDED.template_name_meta,
      category = EXCLUDED.category,
      language = EXCLUDED.language,
      body_preview = EXCLUDED.body_preview,
      variables_schema = EXCLUDED.variables_schema,
      is_active = true;
