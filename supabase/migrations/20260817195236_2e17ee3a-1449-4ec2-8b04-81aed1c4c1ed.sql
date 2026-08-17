-- 1. Cron WhatsApp : ajouter l'en-tête secret interne
DO $do$
DECLARE
  j RECORD;
  new_cmd text;
BEGIN
  FOR j IN SELECT jobid, command FROM cron.job WHERE command LIKE '%/functions/v1/wa-%' LOOP
    IF j.command LIKE '%x-internal-secret%' THEN
      CONTINUE;
    END IF;
    new_cmd := replace(j.command, '''Content-Type'', ''application/json'',',
      '''Content-Type'', ''application/json'', ''x-internal-secret'', ''ef380b1c3affa0aa4c7c82e0caa65707744824158a64ef75'',');
    new_cmd := replace(new_cmd, '''Content-Type'',''application/json'',',
      '''Content-Type'',''application/json'',''x-internal-secret'',''ef380b1c3affa0aa4c7c82e0caa65707744824158a64ef75'',');
    new_cmd := replace(new_cmd, '{"Content-Type":"application/json",',
      '{"Content-Type":"application/json","x-internal-secret":"ef380b1c3affa0aa4c7c82e0caa65707744824158a64ef75",');
    IF new_cmd <> j.command THEN
      PERFORM cron.alter_job(j.jobid, command => new_cmd);
    END IF;
  END LOOP;
END
$do$;

-- 2. Trigger message agent -> WhatsApp : ajouter l'en-tête secret interne
CREATE OR REPLACE FUNCTION public.notify_client_wa_on_agent_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_conv RECORD;
  v_agent_id uuid;
  v_client_agent_id uuid;
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

  SELECT agent_id INTO v_client_agent_id
  FROM clients WHERE id::text = v_conv.client_id;

  v_agent_id := COALESCE(
    v_client_agent_id,
    NULLIF(v_conv.agent_id, '')::uuid
  );

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
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', 'ef380b1c3affa0aa4c7c82e0caa65707744824158a64ef75',
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