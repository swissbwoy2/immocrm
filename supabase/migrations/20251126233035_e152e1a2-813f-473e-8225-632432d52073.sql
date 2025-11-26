-- Function to increment agent's client count
CREATE OR REPLACE FUNCTION public.increment_agent_clients(agent_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agents 
  SET nombre_clients_assignes = COALESCE(nombre_clients_assignes, 0) + 1
  WHERE id = agent_uuid;
END;
$$;

-- Function to decrement agent's client count
CREATE OR REPLACE FUNCTION public.decrement_agent_clients(agent_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agents 
  SET nombre_clients_assignes = GREATEST(COALESCE(nombre_clients_assignes, 0) - 1, 0)
  WHERE id = agent_uuid;
END;
$$;