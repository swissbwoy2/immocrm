
-- 1. Colonnes WhatsApp sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_date timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source text;

-- 2. Table notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  whatsapp_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  offer_alerts_enabled boolean NOT NULL DEFAULT true,
  visit_reminders_enabled boolean NOT NULL DEFAULT true,
  document_alerts_enabled boolean NOT NULL DEFAULT true,
  agent_messages_enabled boolean NOT NULL DEFAULT true,
  candidature_updates_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Table whatsapp_message_templates
CREATE TABLE IF NOT EXISTS public.whatsapp_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  template_name_meta text NOT NULL,
  category text NOT NULL DEFAULT 'UTILITY',
  language text NOT NULL DEFAULT 'fr',
  body_preview text,
  variables_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_wa_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Table whatsapp_notification_logs
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  template_key text,
  recipient_phone text NOT NULL,
  payload_json jsonb,
  status text NOT NULL DEFAULT 'queued',
  meta_message_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_client_id ON public.whatsapp_notification_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_agent_id ON public.whatsapp_notification_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_meta_msg_id ON public.whatsapp_notification_logs(meta_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_created_at ON public.whatsapp_notification_logs(created_at DESC);

ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;

-- 5. Seed templates initiaux Lot 1
INSERT INTO public.whatsapp_message_templates (template_key, template_name_meta, category, language, body_preview, variables_schema)
VALUES
  ('new_offer_available', 'logisorama_new_offer', 'UTILITY', 'fr',
   'Bonjour {{1}}, une nouvelle offre correspondant à vos critères est disponible sur Logisorama. Consultez-la ici : {{2}}',
   '["prenom","lien_offre"]'::jsonb),
  ('visit_reminder_24h', 'logisorama_visit_reminder_24h', 'UTILITY', 'fr',
   'Bonjour {{1}}, rappel : votre visite est prévue demain à {{2}} pour {{3}}. Merci de prévenir votre agent en cas d''empêchement.',
   '["prenom","heure_visite","adresse_bien"]'::jsonb),
  ('agent_message_alert', 'logisorama_agent_message', 'UTILITY', 'fr',
   'Bonjour {{1}}, votre agent {{2}} vous a envoyé un nouveau message sur Logisorama : {{3}}',
   '["prenom","nom_agent","lien_messagerie"]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- 6. RLS Policies

-- notification_preferences
CREATE POLICY "Client manages own notification prefs"
  ON public.notification_preferences FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = notification_preferences.client_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = notification_preferences.client_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Agent reads assigned client prefs"
  ON public.notification_preferences FOR SELECT
  USING (
    public.is_agent_of_client_record(notification_preferences.client_id)
    OR public.is_agent_of_client_via_junction(notification_preferences.client_id)
  );

CREATE POLICY "Admin full access notif prefs"
  ON public.notification_preferences FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- whatsapp_message_templates
CREATE POLICY "Staff reads templates"
  ON public.whatsapp_message_templates FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent')
  );

CREATE POLICY "Admin manages templates"
  ON public.whatsapp_message_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- whatsapp_notification_logs
CREATE POLICY "Client reads own WA logs"
  ON public.whatsapp_notification_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = whatsapp_notification_logs.client_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Agent reads assigned client WA logs"
  ON public.whatsapp_notification_logs FOR SELECT
  USING (
    client_id IS NOT NULL
    AND (
      public.is_agent_of_client_record(client_id)
      OR public.is_agent_of_client_via_junction(client_id)
    )
  );

CREATE POLICY "Admin reads all WA logs"
  ON public.whatsapp_notification_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Aucune policy INSERT/UPDATE/DELETE → seul le service role (Edge Function) peut écrire.
