-- Update the create_notification function to call the edge function via pg_net
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
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_request_id BIGINT;
BEGIN
  -- Insert the notification
  INSERT INTO notifications (user_id, type, title, message, link, metadata, email_sent)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata, false)
  RETURNING id INTO v_notification_id;
  
  -- Call the edge function to send email notification via pg_net
  BEGIN
    SELECT net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E'
      ),
      body := jsonb_build_object(
        'user_id', p_user_id::text,
        'notification_type', p_type,
        'title', p_title,
        'message', p_message,
        'link', p_link
      )
    ) INTO v_request_id;
    
    -- Mark notification as email sent (async call initiated)
    UPDATE notifications SET email_sent = true WHERE id = v_notification_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- If pg_net call fails, log warning but don't fail the notification creation
    RAISE WARNING 'Could not send notification email: %', SQLERRM;
  END;
  
  RETURN v_notification_id;
END;
$$;