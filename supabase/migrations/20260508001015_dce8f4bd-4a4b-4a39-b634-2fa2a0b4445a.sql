
CREATE OR REPLACE FUNCTION public.notify_client_wa_on_agent_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv RECORD;
  v_agent_id uuid;
  v_extract text;
BEGIN
  IF NEW.sender_type IS DISTINCT FROM 'agent' THEN
    RETURN NEW;
  END IF;

  SELECT client_id, agent_id INTO v_conv
  FROM conversations WHERE id = NEW.conversation_id;

  IF v_conv.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_agent_id := v_conv.agent_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_agent_id := NULL;
  END;

  v_extract := left(coalesce(NEW.content, ''), 200);

  BEGIN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/wa-send-agent-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'client_id', v_conv.client_id,
        'agent_id', v_agent_id,
        'message_extract', v_extract,
        'contexte', 'votre messagerie Logisorama'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'wa-send-agent-message dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_on_agent_message ON public.messages;
CREATE TRIGGER trg_wa_on_agent_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_wa_on_agent_message();
