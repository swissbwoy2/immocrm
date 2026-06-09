
DROP POLICY IF EXISTS "Agents can view other agents (directory)" ON public.agents;
CREATE POLICY "Agents can view other agents (directory)"
ON public.agents FOR SELECT
TO authenticated
USING (public.get_my_agent_id() IS NOT NULL);

DROP POLICY IF EXISTS "Agents can view other agents profiles" ON public.profiles;
CREATE POLICY "Agents can view other agents profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.get_my_agent_id() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = profiles.id)
);
