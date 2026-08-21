CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.edge_service_headers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_service_key text;
BEGIN
  SELECT decrypted_secret
    INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF coalesce(v_service_key, '') = '' THEN
    RAISE EXCEPTION 'edge service credential is not configured in Vault';
  END IF;

  RETURN jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_key
  );
END;
$$;

REVOKE ALL ON FUNCTION private.edge_service_headers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.edge_service_headers() TO service_role;

CREATE OR REPLACE FUNCTION public.notify_client_wa_on_agent_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_conv record;
  v_agent_id uuid;
  v_client_agent_id uuid;
  v_extract text;
  v_attachment jsonb;
BEGIN
  IF NEW.sender_type IS DISTINCT FROM 'agent' THEN RETURN NEW; END IF;

  SELECT client_id, agent_id INTO v_conv
  FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_conv.client_id IS NULL THEN RETURN NEW; END IF;

  SELECT agent_id INTO v_client_agent_id
  FROM public.clients WHERE id::text = v_conv.client_id;

  v_agent_id := coalesce(v_client_agent_id, nullif(v_conv.agent_id, '')::uuid);
  v_extract := left(coalesce(NEW.content, ''), 200);
  v_attachment := NULL;

  IF NEW.attachment_url IS NOT NULL THEN
    v_attachment := jsonb_build_object(
      'url', NEW.attachment_url,
      'type', NEW.attachment_type,
      'name', NEW.attachment_name,
      'size', NEW.attachment_size,
      'mime', NULL,
      'thumbnail_url', NEW.attachment_thumbnail_url
    );
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/wa-send-agent-message',
      headers := private.edge_service_headers(),
      body := jsonb_build_object(
        'client_id', v_conv.client_id,
        'agent_id', v_agent_id,
        'message_extract', v_extract,
        'contexte', 'votre messagerie Logisorama',
        'attachment', v_attachment
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'wa-send-agent-message dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
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
  IF NOT (NEW.type = ANY (v_push_allowed)) THEN RETURN NEW; END IF;

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

-- Replace every literal internal-secret header in the known WhatsApp cron jobs
-- with a runtime Vault lookup. The rewrite keeps each job's URL and body intact.
DO $do$
DECLARE
  j record;
  v_headers_pos integer;
  v_body_pos integer;
  v_new_command text;
BEGIN
  FOR j IN
    SELECT jobid, command
    FROM cron.job
    WHERE command ILIKE '%x-internal-secret%'
  LOOP
    v_headers_pos := strpos(lower(j.command), 'headers :=');
    v_body_pos := strpos(lower(j.command), 'body :=');

    IF v_headers_pos > 0 AND v_body_pos > v_headers_pos THEN
      v_new_command :=
        substr(j.command, 1, v_headers_pos - 1) ||
        'headers := private.edge_service_headers(), ' ||
        substr(j.command, v_body_pos);
      PERFORM cron.alter_job(j.jobid, command => v_new_command);
    ELSE
      RAISE EXCEPTION 'Unable to safely rewrite cron job %', j.jobid;
    END IF;
  END LOOP;
END
$do$;
