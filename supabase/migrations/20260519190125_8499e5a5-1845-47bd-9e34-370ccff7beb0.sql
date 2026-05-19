-- Fix AI agent INSERT policies: the WITH CHECK clause used an unqualified `client_id`
-- which Postgres resolved to `aa.client_id` (the inner alias), making the
-- ownership check `aa.client_id = aa.client_id` always true. Qualify the
-- outer-row reference with the target table name so the check actually
-- validates that the assignment matches the row being inserted.

DROP POLICY IF EXISTS "AI agent inserts own actions" ON public.ai_agent_actions;
CREATE POLICY "AI agent inserts own actions"
ON public.ai_agent_actions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_agents ag
    JOIN public.ai_agent_assignments aa ON aa.ai_agent_id = ag.id
    WHERE ag.id = ai_agent_actions.ai_agent_id
      AND ag.user_id = auth.uid()
      AND (ai_agent_actions.client_id IS NULL OR aa.client_id = ai_agent_actions.client_id)
      AND aa.status = 'active'
  )
);

DROP POLICY IF EXISTS "AI agent inserts matches" ON public.ai_agent_property_matches;
CREATE POLICY "AI agent inserts matches"
ON public.ai_agent_property_matches
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_agents ag
    JOIN public.ai_agent_assignments aa ON aa.ai_agent_id = ag.id
    WHERE ag.id = ai_agent_property_matches.ai_agent_id
      AND ag.user_id = auth.uid()
      AND aa.client_id = ai_agent_property_matches.client_id
      AND aa.status = 'active'
  )
);