
CREATE OR REPLACE FUNCTION public.prevent_duplicate_whatsapp_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only guard successful sends with a context_ref
  IF NEW.status NOT IN ('sent','delivered','read') THEN
    RETURN NEW;
  END IF;
  IF NEW.context_ref IS NULL OR NEW.template_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.whatsapp_notification_logs
    WHERE template_key = NEW.template_key
      AND context_ref = NEW.context_ref
      AND context_type IS NOT DISTINCT FROM NEW.context_type
      AND status IN ('sent','delivered','read')
  ) THEN
    -- Skip duplicate insert silently
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_whatsapp_send ON public.whatsapp_notification_logs;
CREATE TRIGGER trg_prevent_duplicate_whatsapp_send
BEFORE INSERT ON public.whatsapp_notification_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_whatsapp_send();
