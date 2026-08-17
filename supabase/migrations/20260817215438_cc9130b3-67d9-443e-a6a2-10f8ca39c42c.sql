-- 1) Plus aucune mise à jour anonyme des rendez-vous
DROP POLICY IF EXISTS "anon can link lead_id once" ON public.lead_phone_appointments;
REVOKE UPDATE ON public.lead_phone_appointments FROM anon;

-- 2) Rénovation : scores et audit bornés au projet
DROP POLICY IF EXISTS "reno_scores_select" ON public.renovation_company_scores;
CREATE POLICY "reno_scores_select"
  ON public.renovation_company_scores FOR SELECT TO authenticated
  USING (
    public.renovation_is_admin()
    OR public.renovation_user_can_view_project(project_id)
  );

DROP POLICY IF EXISTS "reno_audit_select" ON public.renovation_audit_logs;
CREATE POLICY "reno_audit_select"
  ON public.renovation_audit_logs FOR SELECT TO authenticated
  USING (
    public.renovation_is_admin()
    OR public.renovation_user_can_view_project(project_id)
  );