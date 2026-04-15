-- Lot 3 Migration: Incidents, Reserves, Warranties, Alerts, Closure

-- 1. Enum extensions
ALTER TYPE public.renovation_project_status ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE public.renovation_alert_type ADD VALUE IF NOT EXISTS 'incident_critical';
ALTER TYPE public.renovation_alert_type ADD VALUE IF NOT EXISTS 'reservation_blocking';
ALTER TYPE public.renovation_alert_type ADD VALUE IF NOT EXISTS 'project_not_closable';
ALTER TYPE public.renovation_alert_type ADD VALUE IF NOT EXISTS 'no_update';
ALTER TYPE public.renovation_alert_type ADD VALUE IF NOT EXISTS 'final_report_ready';

-- 2. ALTER renovation_projects
ALTER TABLE public.renovation_projects
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID,
  ADD COLUMN IF NOT EXISTS final_report_path TEXT,
  ADD COLUMN IF NOT EXISTS warranties_not_applicable BOOLEAN NOT NULL DEFAULT false;

-- 3. ALTER renovation_incidents
ALTER TABLE public.renovation_incidents
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.renovation_milestones(id),
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS cost_impact NUMERIC,
  ADD COLUMN IF NOT EXISTS delay_impact_days INTEGER,
  ADD COLUMN IF NOT EXISTS is_blocking BOOLEAN NOT NULL DEFAULT false;

-- 4. ALTER renovation_reservations
ALTER TABLE public.renovation_reservations
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.renovation_milestones(id),
  ADD COLUMN IF NOT EXISTS reported_by UUID,
  ADD COLUMN IF NOT EXISTS is_blocking BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validated_by UUID,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- 5. ALTER renovation_warranties
ALTER TABLE public.renovation_warranties
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS equipment TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS serial_number TEXT,
  ADD COLUMN IF NOT EXISTS installation_date DATE,
  ADD COLUMN IF NOT EXISTS maintenance_frequency TEXT,
  ADD COLUMN IF NOT EXISTS invoice_file_id UUID REFERENCES public.renovation_project_files(id),
  ADD COLUMN IF NOT EXISTS notice_file_id UUID REFERENCES public.renovation_project_files(id);

-- 6. ALTER renovation_ai_alerts
ALTER TABLE public.renovation_ai_alerts
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS target_table TEXT,
  ADD COLUMN IF NOT EXISTS target_id UUID;

-- Add unique constraint on idempotency_key (allow nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_renovation_alerts_idempotency
  ON public.renovation_ai_alerts(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 7. ALTER renovation_notifications_queue
ALTER TABLE public.renovation_notifications_queue
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS alert_id UUID REFERENCES public.renovation_ai_alerts(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_renovation_notif_idempotency
  ON public.renovation_notifications_queue(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 8. Audit trigger: incidents
CREATE OR REPLACE FUNCTION public.renovation_audit_incident_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.renovation_audit_logs (
      project_id, user_id, action, target_table, target_id, old_data, new_data
    ) VALUES (
      NEW.project_id,
      auth.uid(),
      CASE WHEN NEW.status IN ('resolved', 'closed') THEN 'incident_resolved' ELSE 'incident_updated' END,
      'renovation_incidents',
      NEW.id,
      jsonb_build_object(
        'title', OLD.title, 'severity', OLD.severity, 'status', OLD.status,
        'resolution', OLD.resolution, 'is_blocking', OLD.is_blocking
      ),
      jsonb_build_object(
        'title', NEW.title, 'severity', NEW.severity, 'status', NEW.status,
        'resolution', NEW.resolution, 'is_blocking', NEW.is_blocking
      )
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_incident_change ON public.renovation_incidents;
CREATE TRIGGER trg_audit_incident_change
  AFTER UPDATE ON public.renovation_incidents
  FOR EACH ROW EXECUTE FUNCTION public.renovation_audit_incident_change();

-- 9. Audit trigger: reservations
CREATE OR REPLACE FUNCTION public.renovation_audit_reservation_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.renovation_audit_logs (
      project_id, user_id, action, target_table, target_id, old_data, new_data
    ) VALUES (
      NEW.project_id,
      auth.uid(),
      CASE WHEN NEW.status = 'resolved' THEN 'reservation_resolved' ELSE 'reservation_updated' END,
      'renovation_reservations',
      NEW.id,
      jsonb_build_object(
        'title', OLD.title, 'description', OLD.description, 'status', OLD.status,
        'is_blocking', OLD.is_blocking, 'validated_by', OLD.validated_by
      ),
      jsonb_build_object(
        'title', NEW.title, 'description', NEW.description, 'status', NEW.status,
        'is_blocking', NEW.is_blocking, 'validated_by', NEW.validated_by
      )
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_reservation_change ON public.renovation_reservations;
CREATE TRIGGER trg_audit_reservation_change
  AFTER UPDATE ON public.renovation_reservations
  FOR EACH ROW EXECUTE FUNCTION public.renovation_audit_reservation_change();

-- 10. RPC: renovation_check_project_closable
CREATE OR REPLACE FUNCTION public.renovation_check_project_closable(_project_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project RECORD;
  _reasons TEXT[] := '{}';
  _cnt INT;
BEGIN
  SELECT status, warranties_not_applicable INTO _project
  FROM public.renovation_projects WHERE id = _project_id;

  IF _project IS NULL THEN
    RETURN jsonb_build_object('canClose', false, 'blockingReasons', jsonb_build_array('Projet non trouvé'));
  END IF;

  -- 1. Status check
  IF _project.status NOT IN ('completed', 'in_progress') THEN
    _reasons := array_append(_reasons, 'Statut projet incompatible (' || _project.status || ')');
  END IF;

  -- 2. Critical incidents
  SELECT count(*) INTO _cnt FROM public.renovation_incidents
  WHERE project_id = _project_id AND severity = 'critical' AND status NOT IN ('resolved', 'closed');
  IF _cnt > 0 THEN
    _reasons := array_append(_reasons, _cnt || ' incident(s) critique(s) non résolu(s)');
  END IF;

  -- 3. Blocking reservations
  SELECT count(*) INTO _cnt FROM public.renovation_reservations
  WHERE project_id = _project_id AND is_blocking = true AND status != 'resolved';
  IF _cnt > 0 THEN
    _reasons := array_append(_reasons, _cnt || ' réserve(s) bloquante(s) non levée(s)');
  END IF;

  -- 4. Milestones
  SELECT count(*) INTO _cnt FROM public.renovation_milestones
  WHERE project_id = _project_id;
  IF _cnt = 0 THEN
    _reasons := array_append(_reasons, 'Aucun jalon défini');
  ELSE
    SELECT count(*) INTO _cnt FROM public.renovation_milestones
    WHERE project_id = _project_id AND status NOT IN ('completed', 'cancelled');
    IF _cnt > 0 THEN
      _reasons := array_append(_reasons, _cnt || ' jalon(s) non terminé(s)');
    END IF;
  END IF;

  -- 5. Warranties
  IF _project.warranties_not_applicable = false THEN
    SELECT count(*) INTO _cnt FROM public.renovation_warranties
    WHERE project_id = _project_id;
    IF _cnt = 0 THEN
      _reasons := array_append(_reasons, 'Aucune garantie et garanties non marquées comme non applicables');
    END IF;
  END IF;

  -- 6. Budget lines
  SELECT count(*) INTO _cnt FROM public.renovation_budget_lines
  WHERE project_id = _project_id;
  IF _cnt = 0 THEN
    _reasons := array_append(_reasons, 'Aucune ligne budgétaire');
  END IF;

  RETURN jsonb_build_object(
    'canClose', array_length(_reasons, 1) IS NULL,
    'blockingReasons', to_jsonb(_reasons)
  );
END; $$;

-- Restrict RPC access to service_role only
REVOKE EXECUTE ON FUNCTION public.renovation_check_project_closable(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renovation_check_project_closable(uuid) FROM authenticated;