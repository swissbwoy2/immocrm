-- Notifications push : réglage pour toute l'équipe (admin, agent…) + journal d'enregistrement des téléphones.
-- Aucun envoi n'est modifié pour les clients : leur réglage reste notification_preferences.push_enabled.

-- 1) Réglage push par compte (admin, agent, coursier… et clients en plus de leur réglage existant)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_push boolean NOT NULL DEFAULT true;

-- 2) Journal d'enregistrement des téléphones (diagnostic : autorisation, jeton reçu, erreurs)
CREATE TABLE IF NOT EXISTS public.push_registration_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text,
  etape text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_registration_log_user ON public.push_registration_log (user_id, created_at DESC);
ALTER TABLE public.push_registration_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_log_insert_own" ON public.push_registration_log;
CREATE POLICY "push_log_insert_own" ON public.push_registration_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "push_log_read_own_or_admin" ON public.push_registration_log;
CREATE POLICY "push_log_read_own_or_admin" ON public.push_registration_log
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Envoi push : respecte aussi le réglage du compte (profiles.notifications_push)
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_internal text[] := ARRAY[
    'badge_earned',
    'scraper_error',
    'scheduler_run_failed_transient',
    'ai_extraction_error',
    'offer_send_failed',
    'inscription_echouee'
  ];
  v_push_enabled boolean;
BEGIN
  IF NEW.user_id IS NULL OR NEW.type = ANY (v_internal) THEN
    RETURN NEW;
  END IF;

  IF NEW.type = 'surveillance_alerte' AND coalesce(NEW.metadata->>'niveau', '') <> 'urgent' THEN
    RETURN NEW;
  END IF;

  SELECT np.push_enabled INTO v_push_enabled
    FROM public.notification_preferences np
    JOIN public.clients c ON c.id = np.client_id
   WHERE c.user_id = NEW.user_id
   LIMIT 1;
  IF v_push_enabled IS FALSE THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.user_id AND p.notifications_push IS FALSE) THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-push-notification',
      headers := private.edge_service_headers(),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'link', NEW.link,
        'data', jsonb_build_object(
          'type', NEW.type,
          'metadata', coalesce(NEW.metadata::text, '{}')
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'push dispatch failed for notification %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
