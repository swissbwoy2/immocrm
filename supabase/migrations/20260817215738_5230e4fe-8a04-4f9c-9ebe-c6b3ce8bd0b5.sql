CREATE OR REPLACE FUNCTION public.renovation_user_can_view_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    -- Administrateur
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR
    -- Créateur du projet
    EXISTS (SELECT 1 FROM public.renovation_projects WHERE id = _project_id AND created_by = auth.uid())
    OR
    -- Membre du projet
    EXISTS (SELECT 1 FROM public.renovation_project_members WHERE project_id = _project_id AND user_id = auth.uid())
    OR
    -- Agent responsable de l'immeuble concerné
    EXISTS (
      SELECT 1 FROM public.renovation_projects rp
      JOIN public.immeubles i ON i.id = rp.immeuble_id
      WHERE rp.id = _project_id AND i.agent_responsable_id = auth.uid()
    )
    OR
    -- Propriétaire de l'immeuble
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
$function$;