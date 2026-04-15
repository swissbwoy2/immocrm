
-- 1. Helper: renovation_agent_can_access_immeuble
CREATE OR REPLACE FUNCTION public.renovation_agent_can_access_immeuble(_immeuble_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.renovation_is_admin() THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.immeubles
    WHERE id = _immeuble_id
      AND agent_responsable_id = auth.uid()
  );
END; $$;

-- 2. Budget audit trigger
CREATE OR REPLACE FUNCTION public.renovation_audit_budget_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.renovation_audit_logs (
    project_id, user_id, action, target_table, target_id, old_data, new_data
  ) VALUES (
    NEW.project_id,
    auth.uid(),
    'budget_updated',
    'renovation_budget_lines',
    NEW.id,
    jsonb_build_object(
      'category', OLD.category, 'label', OLD.label,
      'estimated', OLD.estimated, 'committed', OLD.committed,
      'invoiced', OLD.invoiced, 'paid', OLD.paid, 'notes', OLD.notes
    ),
    jsonb_build_object(
      'category', NEW.category, 'label', NEW.label,
      'estimated', NEW.estimated, 'committed', NEW.committed,
      'invoiced', NEW.invoiced, 'paid', NEW.paid, 'notes', NEW.notes
    )
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_audit_budget_change
  AFTER UPDATE ON public.renovation_budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.renovation_audit_budget_change();

-- 3. RPC: renovation_lock_analysis_job (service_role only)
CREATE OR REPLACE FUNCTION public.renovation_lock_analysis_job(_job_id uuid)
RETURNS SETOF public.renovation_analysis_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role required';
  END IF;
  RETURN QUERY
    UPDATE public.renovation_analysis_jobs
    SET status = 'processing', locked_at = now(), started_at = now(),
        attempts = COALESCE(attempts, 0) + 1, updated_at = now()
    WHERE id = _job_id AND status IN ('queued', 'failed')
    RETURNING *;
END; $$;

REVOKE EXECUTE ON FUNCTION public.renovation_lock_analysis_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renovation_lock_analysis_job(uuid) FROM authenticated;

-- 4. RPC: renovation_replace_quote_items (service_role only, transactional)
CREATE OR REPLACE FUNCTION public.renovation_replace_quote_items(
  _quote_id uuid, _items jsonb, _analysis_result jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role required';
  END IF;

  DELETE FROM public.renovation_quote_items WHERE quote_id = _quote_id;

  INSERT INTO public.renovation_quote_items (
    quote_id, position, designation, description, quantity, unit, unit_price, total_price, tva_rate, category
  )
  SELECT
    _quote_id,
    COALESCE((item->>'position')::int, 0),
    COALESCE(item->>'designation', 'Sans désignation'),
    item->>'description',
    (item->>'quantity')::numeric,
    item->>'unit',
    (item->>'unit_price')::numeric,
    (item->>'total_price')::numeric,
    (item->>'tva_rate')::numeric,
    item->>'category'
  FROM jsonb_array_elements(_items) AS item;

  UPDATE public.renovation_quotes
  SET analysis_result = _analysis_result,
      analyzed_at = now(),
      status = 'analyzed',
      updated_at = now()
  WHERE id = _quote_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.renovation_replace_quote_items(uuid, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renovation_replace_quote_items(uuid, jsonb, jsonb) FROM authenticated;

-- 5. Unique index on renovation_quotes.file_id (anti-duplicate)
CREATE UNIQUE INDEX IF NOT EXISTS idx_renovation_quotes_unique_file
ON public.renovation_quotes (file_id)
WHERE file_id IS NOT NULL;

-- 6. Drop and recreate storage policies with project/ prefix enforcement
DROP POLICY IF EXISTS "reno_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "reno_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "reno_storage_delete" ON storage.objects;

CREATE POLICY "reno_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'renovation-private'
  AND split_part(name, '/', 1) = 'project'
  AND public.renovation_user_can_view_project(split_part(name, '/', 2)::uuid)
);

CREATE POLICY "reno_storage_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'renovation-private'
  AND split_part(name, '/', 1) = 'project'
  AND public.renovation_user_can_upload_to_project(split_part(name, '/', 2)::uuid)
);

CREATE POLICY "reno_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'renovation-private'
  AND split_part(name, '/', 1) = 'project'
  AND public.renovation_is_admin()
);
