-- Créer une fonction security definer pour vérifier si l'utilisateur est l'agent d'un client
CREATE OR REPLACE FUNCTION public.is_agent_of_client(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.agents a ON a.id = c.agent_id
    WHERE c.user_id = profile_id
    AND a.user_id = auth.uid()
  );
$$;

-- Supprimer l'ancienne policy complexe
DROP POLICY IF EXISTS "Agents can view their clients profiles" ON public.profiles;

-- Créer la nouvelle policy simplifiée utilisant la fonction security definer
CREATE POLICY "Agents can view their clients profiles" 
ON public.profiles
FOR SELECT
USING (public.is_agent_of_client(id));