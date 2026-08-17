CREATE TABLE IF NOT EXISTS public.call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

GRANT SELECT ON public.call_participants TO authenticated;
GRANT ALL ON public.call_participants TO service_role;

ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_participants_select_self_or_admin"
ON public.call_participants FOR SELECT TO authenticated
USING (user_id = auth.uid() OR invited_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_call_participants_conv ON public.call_participants(conversation_id);

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
    'candidature_refusee',
    'call_incoming',
    'call_invite'
  ];
BEGIN
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