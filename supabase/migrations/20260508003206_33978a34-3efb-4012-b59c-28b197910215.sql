
CREATE OR REPLACE FUNCTION public.notify_client_wa_on_agent_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conv RECORD;
  v_agent_id uuid;
  v_extract text;
  v_attachment jsonb;
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

  v_attachment := NULL;
  IF NEW.attachment_url IS NOT NULL THEN
    v_attachment := jsonb_build_object(
      'url', NEW.attachment_url,
      'type', NEW.attachment_type,
      'name', NEW.attachment_name,
      'size', NEW.attachment_size,
      'mime', NULL
    );
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/wa-send-agent-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E'
      ),
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
$function$;
