
-- =============================================================
-- FIX: Convert SECURITY DEFINER functions from SQL to PL/pgSQL
-- to prevent PostgreSQL from inlining them (which loses the 
-- SECURITY DEFINER context and causes infinite recursion)
-- =============================================================

-- 1. is_coursier_for_agent
CREATE OR REPLACE FUNCTION public.is_coursier_for_agent(_agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM visites v
    JOIN coursiers c ON c.user_id = auth.uid()
    WHERE v.agent_id = _agent_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id = c.id)
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid());
END;
$$;

-- 2. get_my_agent_id
CREATE OR REPLACE FUNCTION public.get_my_agent_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agent_id uuid;
BEGIN
  SELECT id INTO _agent_id FROM agents WHERE user_id = auth.uid() LIMIT 1;
  RETURN _agent_id;
END;
$$;

-- 3. get_my_co_agent_client_ids
CREATE OR REPLACE FUNCTION public.get_my_co_agent_client_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT ca.client_id FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE a.user_id = auth.uid();
END;
$$;

-- 4. is_coursier_for_client
CREATE OR REPLACE FUNCTION public.is_coursier_for_client(_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM visites v
    JOIN coursiers c ON c.user_id = auth.uid()
    WHERE v.client_id = _client_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id = c.id)
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid());
END;
$$;

-- 5. is_coursier_for_profile
CREATE OR REPLACE FUNCTION public.is_coursier_for_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clients cl
    JOIN visites v ON v.client_id = cl.id
    WHERE cl.user_id = _profile_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id IN (
      SELECT id FROM coursiers WHERE user_id = auth.uid()
    ))
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid());
END;
$$;

-- 6. is_coursier_for_agent_profile
CREATE OR REPLACE FUNCTION public.is_coursier_for_agent_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agents a
    JOIN visites v ON v.agent_id = a.id
    WHERE a.user_id = _profile_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id IN (
      SELECT id FROM coursiers WHERE user_id = auth.uid()
    ))
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid());
END;
$$;

-- 7. Also fix the INSERT policy on visites that still references agents inline
DROP POLICY IF EXISTS "Agents can insert visites" ON public.visites;
CREATE POLICY "Agents can insert visites"
  ON public.visites FOR INSERT
  WITH CHECK (agent_id = get_my_agent_id());
