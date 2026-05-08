-- ====================================================
-- PLAN A — tables Communication & Mobile
-- ====================================================

-- 1) Device tokens (push notifications)
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web','ios','android')),
  token text NOT NULL,
  endpoint text,           -- Web Push: full endpoint URL
  p256dh text,             -- Web Push key
  auth text,               -- Web Push key
  app_version text,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own tokens" ON public.device_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON public.device_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);

-- 2) Préférences de notifications push
CREATE TABLE IF NOT EXISTS public.push_preferences (
  user_id uuid PRIMARY KEY,
  notif_messages boolean NOT NULL DEFAULT true,
  notif_candidatures boolean NOT NULL DEFAULT true,
  notif_compte_rendu boolean NOT NULL DEFAULT true,
  notif_paiements boolean NOT NULL DEFAULT true,
  notif_visites boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their preferences" ON public.push_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) Message templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid,           -- NULL = template d'agence (visible par tous les agents/admins)
  label text NOT NULL,
  body text NOT NULL,
  category text DEFAULT 'general',
  use_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own + agency templates" ON public.message_templates
  FOR SELECT TO authenticated
  USING (
    owner_user_id IS NULL
    OR owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Create own templates" ON public.message_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    (owner_user_id = auth.uid() AND created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Update own templates" ON public.message_templates
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Delete own templates" ON public.message_templates
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Templates d'agence par défaut (seed)
INSERT INTO public.message_templates (owner_user_id, label, body, category) VALUES
  (NULL, 'Confirmation visite', 'Bonjour {{prenom}}, je vous confirme notre visite à {{adresse}} le {{date_visite}}. À tout de suite !', 'visite'),
  (NULL, 'Relance documents', 'Bonjour {{prenom}}, il manque encore quelques documents pour votre dossier. Pouvez-vous me les envoyer rapidement ? Merci.', 'dossier'),
  (NULL, 'Candidature acceptée', 'Excellente nouvelle {{prenom}} ! Votre candidature pour {{adresse}} a été acceptée. Je vous contacte sous peu pour la suite.', 'candidature'),
  (NULL, 'Candidature refusée', 'Bonjour {{prenom}}, malheureusement votre candidature pour {{adresse}} n''a pas été retenue. Nous continuons à chercher activement pour vous.', 'candidature'),
  (NULL, 'Demande de feedback', 'Bonjour {{prenom}}, comment avez-vous trouvé la visite de {{adresse}} ? Êtes-vous toujours intéressé(e) ?', 'visite')
ON CONFLICT DO NOTHING;