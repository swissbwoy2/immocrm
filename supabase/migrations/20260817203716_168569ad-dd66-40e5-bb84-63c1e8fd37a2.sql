CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_push_allowed text[] := ARRAY[
    'new_message',
    'client_souhaite_postuler',
    'client_souhaite_postuler_admin',
    'activation_request',
    'candidature_admin',
    'candidature_status_change',
    'candidature_acceptee',
    'candidature_refusee',
    'call_incoming',
    'call_invite'
  ];
BEGIN
  IF NOT (NEW.type = ANY (v_push_allowed)) THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', 'ef380b1c3affa0aa4c7c82e0caa65707744824158a64ef75'
      ),
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