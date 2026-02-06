
-- =============================================================
-- Fix infinite recursion between agents and visites tables
-- =============================================================

-- STEP 1: Create SECURITY DEFINER functions to break the cycle

-- Function: check if current user (coursier) can see a given agent
CREATE OR REPLACE FUNCTION public.is_coursier_for_agent(_agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM visites v
    JOIN coursiers c ON c.user_id = auth.uid()
    WHERE v.agent_id = _agent_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id = c.id)
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid())
$$;

-- Function: get current user's agent ID without triggering agents RLS
CREATE OR REPLACE FUNCTION public.get_my_agent_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM agents WHERE user_id = auth.uid() LIMIT 1
$$;

-- Function: get client IDs for co-agent relationships without triggering agents RLS
CREATE OR REPLACE FUNCTION public.get_my_co_agent_client_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ca.client_id FROM client_agents ca
  JOIN agents a ON a.id = ca.agent_id
  WHERE a.user_id = auth.uid()
$$;

-- STEP 2: Drop problematic policies on agents table
DROP POLICY IF EXISTS "Coursiers peuvent voir agents de leurs missions" ON public.agents;

-- STEP 3: Drop problematic policies on visites table
DROP POLICY IF EXISTS "Agents can view their visites" ON public.visites;
DROP POLICY IF EXISTS "Agents can update their visites" ON public.visites;
DROP POLICY IF EXISTS "Agents multi peuvent gérer visites" ON public.visites;

-- STEP 4: Recreate policies using SECURITY DEFINER functions

-- agents: coursiers access via function
CREATE POLICY "Coursiers peuvent voir agents de leurs missions"
  ON public.agents FOR SELECT
  USING (is_coursier_for_agent(id));

-- visites: agents view their own visites via function
CREATE POLICY "Agents can view their visites"
  ON public.visites FOR SELECT
  USING (agent_id = get_my_agent_id());

-- visites: agents update their own visites via function
CREATE POLICY "Agents can update their visites"
  ON public.visites FOR UPDATE
  USING (agent_id = get_my_agent_id());

-- visites: multi-agent access via function
CREATE POLICY "Agents multi peuvent gérer visites"
  ON public.visites FOR SELECT
  USING (
    agent_id = get_my_agent_id()
    OR client_id IN (SELECT get_my_co_agent_client_ids())
  );
