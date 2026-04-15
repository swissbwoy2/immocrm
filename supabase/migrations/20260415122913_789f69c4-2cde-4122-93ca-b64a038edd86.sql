-- ============================================================
-- RÉNOVATION INTELLIGENTE — MIGRATION 3 : SÉCURITÉ COMPLÈTE
-- ============================================================

-- ============================================================
-- HELPERS SECURITY DEFINER
-- ============================================================

CREATE OR REPLACE FUNCTION public.renovation_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.renovation_is_agent()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'agent')
  );
$$;

CREATE OR REPLACE FUNCTION public.renovation_company_id_for_current_user()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.renovation_company_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.renovation_user_can_view_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin or agent
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'agent'))
    OR
    -- Project creator
    EXISTS (SELECT 1 FROM public.renovation_projects WHERE id = _project_id AND created_by = auth.uid())
    OR
    -- Project member (not company_user path)
    EXISTS (SELECT 1 FROM public.renovation_project_members WHERE project_id = _project_id AND user_id = auth.uid())
    OR
    -- Proprietaire of the immeuble
    EXISTS (
      SELECT 1 FROM public.renovation_projects rp
      JOIN public.immeubles i ON i.id = rp.immeuble_id
      WHERE rp.id = _project_id
        AND i.proprietaire_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.proprietaires p
          WHERE p.id = i.proprietaire_id AND p.user_id = auth.uid()
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.renovation_user_can_manage_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'agent'))
    OR
    EXISTS (SELECT 1 FROM public.renovation_project_members WHERE project_id = _project_id AND user_id = auth.uid() AND can_validate = true);
$$;

CREATE OR REPLACE FUNCTION public.renovation_user_can_upload_to_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.renovation_user_can_view_project(_project_id)
    OR
    EXISTS (
      SELECT 1 FROM public.renovation_project_companies rpc
      JOIN public.renovation_company_users rcu ON rcu.company_id = rpc.company_id
      WHERE rpc.project_id = _project_id AND rcu.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.renovation_user_can_view_project_internal(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'agent'))
    OR
    EXISTS (SELECT 1 FROM public.renovation_project_members WHERE project_id = _project_id AND user_id = auth.uid() AND can_validate = true);
$$;

CREATE OR REPLACE FUNCTION public.renovation_is_company_user_on_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.renovation_project_companies rpc
    JOIN public.renovation_company_users rcu ON rcu.company_id = rpc.company_id
    WHERE rpc.project_id = _project_id AND rcu.user_id = auth.uid()
  );
$$;

-- ============================================================
-- TRIGGER: update_updated_at_column (reuse if exists)
-- ============================================================
CREATE OR REPLACE FUNCTION public.renovation_update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply trigger to 15 tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'renovation_projects', 'renovation_project_members', 'renovation_project_files',
    'renovation_analysis_jobs', 'renovation_companies', 'renovation_project_companies',
    'renovation_company_scores', 'renovation_quotes', 'renovation_budget_lines',
    'renovation_milestones', 'renovation_tasks', 'renovation_incidents',
    'renovation_permits', 'renovation_warranties', 'renovation_reservations'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.renovation_update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- RLS: Enable on ALL 22 tables
-- ============================================================
ALTER TABLE public.renovation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_project_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_project_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_company_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_notifications_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: renovation_projects (BLOCKED for company_users)
-- ============================================================
CREATE POLICY "reno_projects_select_internal"
  ON public.renovation_projects FOR SELECT TO authenticated
  USING (public.renovation_user_can_view_project(id));

CREATE POLICY "reno_projects_insert"
  ON public.renovation_projects FOR INSERT TO authenticated
  WITH CHECK (public.renovation_is_agent());

CREATE POLICY "reno_projects_update"
  ON public.renovation_projects FOR UPDATE TO authenticated
  USING (public.renovation_user_can_manage_project(id));

CREATE POLICY "reno_projects_delete"
  ON public.renovation_projects FOR DELETE TO authenticated
  USING (public.renovation_is_admin());

-- ============================================================
-- POLICIES: renovation_project_members
-- ============================================================
CREATE POLICY "reno_members_select"
  ON public.renovation_project_members FOR SELECT TO authenticated
  USING (public.renovation_user_can_view_project(project_id));

CREATE POLICY "reno_members_insert"
  ON public.renovation_project_members FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

CREATE POLICY "reno_members_update"
  ON public.renovation_project_members FOR UPDATE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

CREATE POLICY "reno_members_delete"
  ON public.renovation_project_members FOR DELETE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_project_files
-- ============================================================
CREATE POLICY "reno_files_select"
  ON public.renovation_project_files FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR (
      public.renovation_is_company_user_on_project(project_id)
      AND category NOT IN ('contract', 'diagnostic', 'insurance')
    )
  );

CREATE POLICY "reno_files_insert"
  ON public.renovation_project_files FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_upload_to_project(project_id));

CREATE POLICY "reno_files_delete"
  ON public.renovation_project_files FOR DELETE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_analysis_jobs
-- ============================================================
CREATE POLICY "reno_jobs_select"
  ON public.renovation_analysis_jobs FOR SELECT TO authenticated
  USING (public.renovation_user_can_view_project(project_id));

CREATE POLICY "reno_jobs_insert"
  ON public.renovation_analysis_jobs FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_upload_to_project(project_id));

-- ============================================================
-- POLICIES: renovation_project_internal_notes (ADMIN/AGENT/VALIDATOR ONLY)
-- ============================================================
CREATE POLICY "reno_internal_notes_select"
  ON public.renovation_project_internal_notes FOR SELECT TO authenticated
  USING (public.renovation_user_can_view_project_internal(project_id));

CREATE POLICY "reno_internal_notes_insert"
  ON public.renovation_project_internal_notes FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_view_project_internal(project_id));

-- ============================================================
-- POLICIES: renovation_companies
-- ============================================================
CREATE POLICY "reno_companies_select"
  ON public.renovation_companies FOR SELECT TO authenticated
  USING (
    public.renovation_is_agent()
    OR public.renovation_company_id_for_current_user() = id
  );

CREATE POLICY "reno_companies_insert"
  ON public.renovation_companies FOR INSERT TO authenticated
  WITH CHECK (public.renovation_is_agent());

CREATE POLICY "reno_companies_update"
  ON public.renovation_companies FOR UPDATE TO authenticated
  USING (public.renovation_is_agent());

-- ============================================================
-- POLICIES: renovation_company_users
-- ============================================================
CREATE POLICY "reno_company_users_select"
  ON public.renovation_company_users FOR SELECT TO authenticated
  USING (
    public.renovation_is_agent()
    OR company_id = public.renovation_company_id_for_current_user()
  );

CREATE POLICY "reno_company_users_insert"
  ON public.renovation_company_users FOR INSERT TO authenticated
  WITH CHECK (public.renovation_is_agent());

-- ============================================================
-- POLICIES: renovation_project_companies
-- ============================================================
CREATE POLICY "reno_project_companies_select"
  ON public.renovation_project_companies FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR (
      public.renovation_is_company_user_on_project(project_id)
      AND company_id = public.renovation_company_id_for_current_user()
    )
  );

CREATE POLICY "reno_project_companies_insert"
  ON public.renovation_project_companies FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

CREATE POLICY "reno_project_companies_update"
  ON public.renovation_project_companies FOR UPDATE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_company_scores (BLOCKED for company_users except own final_score via view)
-- ============================================================
CREATE POLICY "reno_scores_select"
  ON public.renovation_company_scores FOR SELECT TO authenticated
  USING (public.renovation_is_agent());

CREATE POLICY "reno_scores_insert"
  ON public.renovation_company_scores FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

CREATE POLICY "reno_scores_update"
  ON public.renovation_company_scores FOR UPDATE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_quotes (company_user sees only own quotes)
-- ============================================================
CREATE POLICY "reno_quotes_select"
  ON public.renovation_quotes FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR company_id = public.renovation_company_id_for_current_user()
  );

CREATE POLICY "reno_quotes_insert"
  ON public.renovation_quotes FOR INSERT TO authenticated
  WITH CHECK (
    public.renovation_user_can_manage_project(project_id)
    OR company_id = public.renovation_company_id_for_current_user()
  );

CREATE POLICY "reno_quotes_update"
  ON public.renovation_quotes FOR UPDATE TO authenticated
  USING (
    public.renovation_user_can_manage_project(project_id)
    OR company_id = public.renovation_company_id_for_current_user()
  );

-- ============================================================
-- POLICIES: renovation_quote_items (follows quote access)
-- ============================================================
CREATE POLICY "reno_quote_items_select"
  ON public.renovation_quote_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.renovation_quotes q
      WHERE q.id = quote_id
        AND (
          public.renovation_user_can_view_project(q.project_id)
          OR q.company_id = public.renovation_company_id_for_current_user()
        )
    )
  );

CREATE POLICY "reno_quote_items_insert"
  ON public.renovation_quote_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.renovation_quotes q
      WHERE q.id = quote_id
        AND (
          public.renovation_user_can_manage_project(q.project_id)
          OR q.company_id = public.renovation_company_id_for_current_user()
        )
    )
  );

-- ============================================================
-- POLICIES: renovation_budget_lines (ADMIN/AGENT/INTERNAL ONLY)
-- ============================================================
CREATE POLICY "reno_budget_select"
  ON public.renovation_budget_lines FOR SELECT TO authenticated
  USING (public.renovation_user_can_view_project_internal(project_id));

CREATE POLICY "reno_budget_insert"
  ON public.renovation_budget_lines FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

CREATE POLICY "reno_budget_update"
  ON public.renovation_budget_lines FOR UPDATE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_milestones
-- ============================================================
CREATE POLICY "reno_milestones_select"
  ON public.renovation_milestones FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR public.renovation_is_company_user_on_project(project_id)
  );

CREATE POLICY "reno_milestones_insert"
  ON public.renovation_milestones FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

CREATE POLICY "reno_milestones_update"
  ON public.renovation_milestones FOR UPDATE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_tasks (company_user: only own tasks)
-- ============================================================
CREATE POLICY "reno_tasks_select"
  ON public.renovation_tasks FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR (
      public.renovation_is_company_user_on_project(project_id)
      AND company_id = public.renovation_company_id_for_current_user()
    )
  );

CREATE POLICY "reno_tasks_insert"
  ON public.renovation_tasks FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

CREATE POLICY "reno_tasks_update"
  ON public.renovation_tasks FOR UPDATE TO authenticated
  USING (
    public.renovation_user_can_manage_project(project_id)
    OR (
      public.renovation_is_company_user_on_project(project_id)
      AND company_id = public.renovation_company_id_for_current_user()
    )
  );

-- ============================================================
-- POLICIES: renovation_updates
-- ============================================================
CREATE POLICY "reno_updates_select"
  ON public.renovation_updates FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR public.renovation_is_company_user_on_project(project_id)
  );

CREATE POLICY "reno_updates_insert"
  ON public.renovation_updates FOR INSERT TO authenticated
  WITH CHECK (
    public.renovation_user_can_view_project(project_id)
    OR public.renovation_is_company_user_on_project(project_id)
  );

-- ============================================================
-- POLICIES: renovation_incidents
-- ============================================================
CREATE POLICY "reno_incidents_select"
  ON public.renovation_incidents FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR public.renovation_is_company_user_on_project(project_id)
  );

CREATE POLICY "reno_incidents_insert"
  ON public.renovation_incidents FOR INSERT TO authenticated
  WITH CHECK (
    public.renovation_user_can_view_project(project_id)
    OR public.renovation_is_company_user_on_project(project_id)
  );

CREATE POLICY "reno_incidents_update"
  ON public.renovation_incidents FOR UPDATE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_permits
-- ============================================================
CREATE POLICY "reno_permits_select"
  ON public.renovation_permits FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR public.renovation_is_company_user_on_project(project_id)
  );

CREATE POLICY "reno_permits_insert"
  ON public.renovation_permits FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_warranties
-- ============================================================
CREATE POLICY "reno_warranties_select"
  ON public.renovation_warranties FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR (
      public.renovation_is_company_user_on_project(project_id)
      AND company_id = public.renovation_company_id_for_current_user()
    )
  );

CREATE POLICY "reno_warranties_insert"
  ON public.renovation_warranties FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_reservations (company_user: only own)
-- ============================================================
CREATE POLICY "reno_reservations_select"
  ON public.renovation_reservations FOR SELECT TO authenticated
  USING (
    public.renovation_user_can_view_project(project_id)
    OR (
      public.renovation_is_company_user_on_project(project_id)
      AND company_id = public.renovation_company_id_for_current_user()
    )
  );

CREATE POLICY "reno_reservations_insert"
  ON public.renovation_reservations FOR INSERT TO authenticated
  WITH CHECK (public.renovation_user_can_manage_project(project_id));

CREATE POLICY "reno_reservations_update"
  ON public.renovation_reservations FOR UPDATE TO authenticated
  USING (
    public.renovation_user_can_manage_project(project_id)
    OR (
      public.renovation_is_company_user_on_project(project_id)
      AND company_id = public.renovation_company_id_for_current_user()
    )
  );

-- ============================================================
-- POLICIES: renovation_ai_alerts (ADMIN/AGENT/INTERNAL ONLY)
-- ============================================================
CREATE POLICY "reno_alerts_select"
  ON public.renovation_ai_alerts FOR SELECT TO authenticated
  USING (public.renovation_user_can_view_project_internal(project_id));

CREATE POLICY "reno_alerts_update"
  ON public.renovation_ai_alerts FOR UPDATE TO authenticated
  USING (public.renovation_user_can_manage_project(project_id));

-- ============================================================
-- POLICIES: renovation_notifications_queue (own notifications only)
-- ============================================================
CREATE POLICY "reno_notifications_select"
  ON public.renovation_notifications_queue FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

CREATE POLICY "reno_notifications_update"
  ON public.renovation_notifications_queue FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid());

-- ============================================================
-- POLICIES: renovation_audit_logs (ADMIN/AGENT ONLY)
-- ============================================================
CREATE POLICY "reno_audit_select"
  ON public.renovation_audit_logs FOR SELECT TO authenticated
  USING (public.renovation_is_agent());

CREATE POLICY "reno_audit_insert"
  ON public.renovation_audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- SECURE VIEWS FOR COMPANY USERS
-- ============================================================

CREATE OR REPLACE VIEW public.renovation_projects_company_view AS
SELECT
  rp.id,
  rp.title,
  rp.status,
  rp.project_type,
  rp.start_date_planned,
  rp.end_date_planned,
  rp.priority
FROM public.renovation_projects rp
WHERE public.renovation_is_company_user_on_project(rp.id);

CREATE OR REPLACE VIEW public.renovation_my_company_score_view AS
SELECT
  rcs.id,
  rcs.project_id,
  rcs.company_id,
  rcs.final_score,
  rcs.scored_at
FROM public.renovation_company_scores rcs
WHERE rcs.company_id = public.renovation_company_id_for_current_user();

-- ============================================================
-- STORAGE: Private bucket + policies
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'renovation-private',
  'renovation-private',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage SELECT: project members or company_users on project
CREATE POLICY "reno_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'renovation-private'
    AND (
      public.renovation_user_can_view_project(
        (string_to_array(name, '/'))[2]::UUID
      )
      OR public.renovation_is_company_user_on_project(
        (string_to_array(name, '/'))[2]::UUID
      )
    )
  );

-- Storage INSERT: can upload
CREATE POLICY "reno_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'renovation-private'
    AND public.renovation_user_can_upload_to_project(
      (string_to_array(name, '/'))[2]::UUID
    )
  );

-- Storage DELETE: admin only
CREATE POLICY "reno_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'renovation-private'
    AND public.renovation_is_admin()
  );