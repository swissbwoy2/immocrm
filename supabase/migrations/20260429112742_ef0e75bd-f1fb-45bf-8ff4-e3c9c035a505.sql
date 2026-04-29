
-- =====================================================================
-- Co-agent parity: harden RLS on offres + visites + conversations
-- and clean up Victoria's orphan offres (no message ever sent).
-- =====================================================================

-- 1) OFFRES: full parity (principal via clients.agent_id OR co via client_agents)
DROP POLICY IF EXISTS "Agents multi peuvent créer offres" ON public.offres;
DROP POLICY IF EXISTS "Agents multi peuvent modifier offres de leurs clients" ON public.offres;
DROP POLICY IF EXISTS "Agents multi peuvent voir offres de leurs clients" ON public.offres;
DROP POLICY IF EXISTS "Agents can view their own created offres" ON public.offres;
DROP POLICY IF EXISTS "Agents peuvent supprimer leurs offres" ON public.offres;

CREATE POLICY "Agents (principal + co) can create offres"
ON public.offres FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = offres.agent_id AND a.user_id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a2 ON a2.id = c.agent_id
             WHERE c.id = offres.client_id AND a2.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a3 ON a3.id = ca.agent_id
                WHERE ca.client_id = offres.client_id AND a3.user_id = auth.uid())
  )
);

CREATE POLICY "Agents (principal + co) can view offres"
ON public.offres FOR SELECT TO authenticated
USING (
  agent_id = public.get_my_agent_id()
  OR EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a ON a.id = c.agent_id
             WHERE c.id = offres.client_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a ON a.id = ca.agent_id
              WHERE ca.client_id = offres.client_id AND a.user_id = auth.uid())
);

CREATE POLICY "Agents (principal + co) can update offres"
ON public.offres FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a ON a.id = c.agent_id
           WHERE c.id = offres.client_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a ON a.id = ca.agent_id
              WHERE ca.client_id = offres.client_id AND a.user_id = auth.uid())
);

CREATE POLICY "Agents (principal + co) can delete offres"
ON public.offres FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = offres.agent_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a ON a.id = c.agent_id
              WHERE c.id = offres.client_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a ON a.id = ca.agent_id
              WHERE ca.client_id = offres.client_id AND a.user_id = auth.uid())
);

-- 2) CONVERSATIONS: extend can_agent_create_conversation to accept primary agent too
CREATE OR REPLACE FUNCTION public.can_agent_create_conversation(_agent_id text, _client_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = _agent_id::uuid
        AND a.user_id = auth.uid()
    )
    AND (
      _client_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.client_agents ca
        WHERE ca.client_id = _client_id::uuid
          AND ca.agent_id = _agent_id::uuid
      )
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = _client_id::uuid
          AND c.agent_id = _agent_id::uuid
      )
    );
END;
$function$;

-- 3) VISITES: ensure co-agents can INSERT/UPDATE visits for clients they share
DO $$
BEGIN
  -- Drop only if exists, then recreate with parity logic
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='visites' AND policyname='Agents (principal + co) can manage visites') THEN
    DROP POLICY "Agents (principal + co) can manage visites" ON public.visites;
  END IF;
END $$;

CREATE POLICY "Agents (principal + co) can manage visites"
ON public.visites FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = visites.agent_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a ON a.id = c.agent_id
              WHERE c.id = visites.client_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a ON a.id = ca.agent_id
              WHERE ca.client_id = visites.client_id AND a.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = visites.agent_id AND a.user_id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a2 ON a2.id = c.agent_id
             WHERE c.id = visites.client_id AND a2.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a3 ON a3.id = ca.agent_id
                WHERE ca.client_id = visites.client_id AND a3.user_id = auth.uid())
  )
);

-- 4) Cleanup: delete Victoria's 3 orphan offres from today (no message attached)
DELETE FROM public.offres
WHERE id IN (
  '663a6127-abe1-4155-ac6e-3192e5dd2f24',
  '04de3136-8ad0-416d-a6ed-6fe987d8e1cd',
  '0e3a7717-560f-4e12-b79c-3ae000d3293b'
)
AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.offre_id = offres.id);
