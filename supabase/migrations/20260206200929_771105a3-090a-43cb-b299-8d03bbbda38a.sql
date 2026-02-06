
-- Étape 1 : Créer des fonctions SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.is_coursier_for_client(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM visites v
    JOIN coursiers c ON c.user_id = auth.uid()
    WHERE v.client_id = _client_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id = c.id)
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_coursier_for_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients cl
    JOIN visites v ON v.client_id = cl.id
    WHERE cl.user_id = _profile_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id IN (
      SELECT id FROM coursiers WHERE user_id = auth.uid()
    ))
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_coursier_for_agent_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agents a
    JOIN visites v ON v.agent_id = a.id
    WHERE a.user_id = _profile_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id IN (
      SELECT id FROM coursiers WHERE user_id = auth.uid()
    ))
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid())
$$;

-- Étape 2 : Supprimer les politiques problématiques

DROP POLICY IF EXISTS "Coursiers peuvent voir clients de leurs missions" ON public.clients;
DROP POLICY IF EXISTS "Coursiers peuvent voir profils clients de leurs missions" ON public.profiles;
DROP POLICY IF EXISTS "Coursiers peuvent voir profils agents de leurs missions" ON public.profiles;

-- Étape 3 : Recréer les politiques avec les fonctions SECURITY DEFINER

CREATE POLICY "Coursiers peuvent voir clients de leurs missions"
  ON public.clients FOR SELECT
  USING (public.is_coursier_for_client(id));

CREATE POLICY "Coursiers peuvent voir profils clients de leurs missions"
  ON public.profiles FOR SELECT
  USING (public.is_coursier_for_profile(id));

CREATE POLICY "Coursiers peuvent voir profils agents de leurs missions"
  ON public.profiles FOR SELECT
  USING (public.is_coursier_for_agent_profile(id));
