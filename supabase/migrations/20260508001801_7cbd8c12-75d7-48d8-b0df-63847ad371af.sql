
ALTER TABLE public.whatsapp_notification_logs
  ADD COLUMN IF NOT EXISTS context_type text,
  ADD COLUMN IF NOT EXISTS context_ref text;

CREATE INDEX IF NOT EXISTS idx_wa_logs_context ON public.whatsapp_notification_logs(context_type, context_ref);
CREATE INDEX IF NOT EXISTS idx_wa_logs_status_created ON public.whatsapp_notification_logs(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_admins_on_wa_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin RECORD;
  v_msg text;
  v_code text;
BEGIN
  IF NEW.status <> 'failed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'failed' THEN
    RETURN NEW;
  END IF;

  v_code := COALESCE(NULLIF(regexp_replace(COALESCE(NEW.error_message,''), '.*"code"\s*:\s*(\d+).*', '\1'), NEW.error_message), '?');
  v_msg := 'Template ' || COALESCE(NEW.template_key,'?')
        || ' → ' || COALESCE(NEW.recipient_phone,'?')
        || ' (code Meta ' || v_code || ')'
        || CASE WHEN NEW.context_ref IS NOT NULL
                THEN ' | ' || COALESCE(NEW.context_type,'ref') || '=' || NEW.context_ref
                ELSE '' END;

  FOR v_admin IN SELECT user_id FROM user_roles WHERE role = 'admin' LOOP
    PERFORM create_notification(
      v_admin.user_id,
      'whatsapp_failure',
      '🚨 Échec WhatsApp ' || COALESCE(NEW.template_key,''),
      v_msg,
      '/admin/whatsapp-logs',
      jsonb_build_object('log_id', NEW.id::text, 'template_key', NEW.template_key, 'context_ref', NEW.context_ref)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_failure_notify ON public.whatsapp_notification_logs;
CREATE TRIGGER trg_wa_failure_notify
AFTER INSERT OR UPDATE OF status ON public.whatsapp_notification_logs
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_wa_failure();
