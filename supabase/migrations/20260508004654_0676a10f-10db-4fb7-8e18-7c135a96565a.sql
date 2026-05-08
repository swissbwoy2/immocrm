-- Colonne miniature vidéo
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_thumbnail_url text;

-- Mise à jour du trigger pour passer la miniature
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
      'mime', NULL,
      'thumbnail_url', NEW.attachment_thumbnail_url
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

-- Table de suivi des alertes "compte-rendu en retard" envoyées (idempotence cron)
CREATE TABLE IF NOT EXISTS public.compte_rendu_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visite_id uuid NOT NULL REFERENCES public.visites(id) ON DELETE CASCADE,
  agent_id uuid,
  hours_late int NOT NULL,
  alerted_at timestamptz NOT NULL DEFAULT now(),
  alert_type text NOT NULL DEFAULT 'admin_daily',
  UNIQUE(visite_id, alert_type)
);

ALTER TABLE public.compte_rendu_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read alerts" ON public.compte_rendu_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage alerts" ON public.compte_rendu_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);