-- Drop and recreate the create_notification function to also trigger email sending
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
BEGIN
  -- Insert the notification
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  -- Call the edge function to send email notification asynchronously
  -- This uses pg_net extension if available, otherwise notification will be created without email
  BEGIN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', p_user_id::text,
        'notification_type', p_type,
        'title', p_title,
        'message', p_message,
        'link', p_link
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- If pg_net is not available or fails, just log and continue
    RAISE WARNING 'Could not send notification email: %', SQLERRM;
  END;
  
  RETURN v_notification_id;
END;
$function$;

-- Create a trigger function to send email on notification insert (alternative approach)
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log that a notification was created (email will be sent via the hook)
  RAISE NOTICE 'Notification created for user %: %', NEW.user_id, NEW.title;
  RETURN NEW;
END;
$function$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_email();