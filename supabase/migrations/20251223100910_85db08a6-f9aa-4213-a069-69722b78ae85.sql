-- Update create_notification function to hardcode Supabase URL and use anon key
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
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

  -- Trigger async email notification via edge function
  -- Using hardcoded URL and anon key to avoid dependency on database settings
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
    RAISE NOTICE 'Email notification queued for notification %', v_notification_id;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block the notification creation
    RAISE WARNING 'Failed to queue notification email for %: %', v_notification_id, SQLERRM;
  END;

  RETURN v_notification_id;
END;
$function$;

-- Add email_sent column to notifications table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN email_sent boolean DEFAULT false;
  END IF;
END $$;