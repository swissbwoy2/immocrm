-- 1. Remove duplicate triggers
DROP TRIGGER IF EXISTS trigger_notify_new_visit ON public.visites;
DROP TRIGGER IF EXISTS trigger_visite_status_notification ON public.visites;
DROP TRIGGER IF EXISTS trigger_notify_new_offer ON public.offres;

-- 2. Push exclusion list
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service_key text;
  v_headers jsonb;
  v_push_allowed text[] := ARRAY[
    'new_message',
    'client_souhaite_postuler',
    'client_souhaite_postuler_admin',
    'activation_request',
    'candidature_admin',
    'candidature_status_change',
    'candidature_acceptee',
    'candidature_refusee'
  ];
BEGIN
  -- Only push for explicitly allow-listed, actionable, individual events.
  IF NOT (NEW.type = ANY (v_push_allowed)) THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name IN ('service_role_key', 'SUPABASE_SERVICE_ROLE_KEY')
    ORDER BY name
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  IF v_service_key IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_service_key);
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-push-notification',
      headers := v_headers,
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'link', NEW.link,
        'data', jsonb_build_object(
          'type', NEW.type,
          'metadata', COALESCE(NEW.metadata::text, '{}')
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'push dispatch failed for notification %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- 3. Stronger dedup window (10 min) on create_notification, incl. offre_id
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
  v_existing_id UUID;
  v_visite TEXT := p_metadata->>'visite_id';
  v_offre TEXT := p_metadata->>'offre_id';
  v_cand TEXT := p_metadata->>'candidature_id';
  v_conv TEXT := p_metadata->>'conversation_id';
  v_client TEXT := p_metadata->>'client_id';
  v_demande TEXT := p_metadata->>'demande_id';
  v_has_key BOOLEAN;
BEGIN
  v_has_key := COALESCE(v_visite, v_offre, v_cand, v_conv, v_client, v_demande) IS NOT NULL;

  -- visit_reminder: never create more than one per (user, visite) — ever.
  IF p_type = 'visit_reminder' AND v_visite IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM notifications
    WHERE user_id = p_user_id
      AND type = 'visit_reminder'
      AND metadata->>'visite_id' = v_visite
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  -- Generic dedup: same user + type + same entity within 10 minutes
  SELECT id INTO v_existing_id
  FROM notifications
  WHERE user_id = p_user_id
    AND type = p_type
    AND created_at > now() - interval '10 minutes'
    AND (
      (v_visite IS NOT NULL AND metadata->>'visite_id' = v_visite)
      OR (v_offre IS NOT NULL AND metadata->>'offre_id' = v_offre)
      OR (v_cand IS NOT NULL AND metadata->>'candidature_id' = v_cand)
      OR (v_conv IS NOT NULL AND metadata->>'conversation_id' = v_conv)
      OR (v_client IS NOT NULL AND metadata->>'client_id' = v_client)
      OR (v_demande IS NOT NULL AND metadata->>'demande_id' = v_demande)
      OR (NOT v_has_key AND title = p_title)
    )
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;

  BEGIN
    PERFORM net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E'
      ),
      body := jsonb_build_object('notification_id', v_notification_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue notification email for %: %', v_notification_id, SQLERRM;
  END;

  RETURN v_notification_id;
END;
$function$;

-- 4. Index to keep dedup lookups fast
CREATE INDEX IF NOT EXISTS idx_notifications_dedup
  ON public.notifications (user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_visite_meta
  ON public.notifications ((metadata->>'visite_id')) WHERE metadata ? 'visite_id';
