CREATE POLICY "Co-agents can view shared calendar events"
  ON public.calendar_events FOR SELECT
  USING (
    client_id IS NOT NULL
    AND client_id IN (SELECT public.get_my_co_agent_client_ids())
  );