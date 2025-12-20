-- 1. Améliorer la fonction create_notification avec protection anti-doublon
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, 
  p_type text, 
  p_title text, 
  p_message text, 
  p_link text DEFAULT NULL::text, 
  p_metadata jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
  v_existing_id UUID;
  v_dedup_key TEXT;
BEGIN
  -- Generate a deduplication key based on user, type, and relevant metadata
  v_dedup_key := COALESCE(
    p_metadata->>'visite_id',
    p_metadata->>'candidature_id', 
    p_metadata->>'conversation_id',
    p_metadata->>'client_id',
    p_metadata->>'demande_id',
    ''
  );

  -- Check for duplicate notification in the last 5 minutes
  SELECT id INTO v_existing_id
  FROM notifications
  WHERE user_id = p_user_id
    AND type = p_type
    AND created_at > now() - interval '5 minutes'
    AND (
      -- Either same dedup_key if exists
      (v_dedup_key != '' AND metadata->>'visite_id' = v_dedup_key)
      OR (v_dedup_key != '' AND metadata->>'candidature_id' = v_dedup_key)
      OR (v_dedup_key != '' AND metadata->>'conversation_id' = v_dedup_key)
      OR (v_dedup_key != '' AND metadata->>'client_id' = v_dedup_key)
      OR (v_dedup_key != '' AND metadata->>'demande_id' = v_dedup_key)
      -- Or same title if no dedup_key
      OR (v_dedup_key = '' AND title = p_title)
    )
  LIMIT 1;

  -- If duplicate found, return existing id without inserting
  IF v_existing_id IS NOT NULL THEN
    RAISE NOTICE 'Duplicate notification detected for user %, type %, skipping insert', p_user_id, p_type;
    RETURN v_existing_id;
  END IF;

  -- Insert the notification
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;

  -- Trigger async email notification
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('notification_id', v_notification_id)
  );

  RETURN v_notification_id;
END;
$function$;

-- 2. Create an index to speed up duplicate detection
CREATE INDEX IF NOT EXISTS idx_notifications_dedup 
ON notifications(user_id, type, created_at DESC);

-- 3. Create index for faster lookups by metadata keys
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_visite 
ON notifications((metadata->>'visite_id'))
WHERE metadata->>'visite_id' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_metadata_candidature 
ON notifications((metadata->>'candidature_id'))
WHERE metadata->>'candidature_id' IS NOT NULL;