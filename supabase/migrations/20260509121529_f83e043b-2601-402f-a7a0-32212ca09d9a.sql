-- Ajout des colonnes de suivi des rappels (4 paliers, email + WhatsApp)
ALTER TABLE public.lead_phone_appointments
  ADD COLUMN IF NOT EXISTS reminder_3h_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_30m_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS wa_reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS wa_reminder_3h_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS wa_reminder_1h_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS wa_reminder_30m_sent_at timestamptz;

-- Index pour requêter rapidement les RDV à venir
CREATE INDEX IF NOT EXISTS idx_lpa_slot_start_status
  ON public.lead_phone_appointments (slot_start)
  WHERE status IN ('confirme','en_attente');

-- Insertion du nouveau template WhatsApp UTILITY pour les rappels (4 paliers via variable horaire)
INSERT INTO public.whatsapp_message_templates (
  template_key, template_name_meta, language, category, body_preview, variables_schema, is_active
) VALUES (
  'rdv_bureau_rappel',
  'logisorama_rdv_bureau_rappel',
  'fr',
  'UTILITY',
  'Bonjour {{1}}, petit rappel : ton RDV au bureau Logisorama (Chemin de l''Esparcette 5, 1023 Crissier) est prévu {{2}}. À tout bientôt !',
  '[{"key":"first_name_or_fallback","example":"Christ"},{"key":"horaire","example":"demain à 10h00"}]'::jsonb,
  false  -- inactif tant que Meta n'a pas approuvé
)
ON CONFLICT (template_key) DO NOTHING;

-- Mise à jour du template d'invitation v2 (Meta a renommé en _v2)
UPDATE public.whatsapp_message_templates
SET template_name_meta = 'logisorama_location_rdv_crissier_v2',
    updated_at = now()
WHERE template_key = 'location_rdv_activation_v2';