
-- Create SECURITY DEFINER function to activate agent on login (bypasses RLS)
CREATE OR REPLACE FUNCTION public.activate_agent_on_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agents
  SET statut = 'actif', updated_at = now()
  WHERE user_id = auth.uid()
    AND statut = 'en_attente';
END;
$$;

-- Create SECURITY DEFINER function to activate apporteur on login
CREATE OR REPLACE FUNCTION public.activate_apporteur_on_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE apporteurs
  SET statut = 'actif', updated_at = now()
  WHERE user_id = auth.uid()
    AND statut = 'en_attente';
END;
$$;

-- Create SECURITY DEFINER function to activate coursier on login
CREATE OR REPLACE FUNCTION public.activate_coursier_on_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coursiers
  SET statut = 'actif', updated_at = now()
  WHERE user_id = auth.uid()
    AND statut = 'en_attente';
END;
$$;
