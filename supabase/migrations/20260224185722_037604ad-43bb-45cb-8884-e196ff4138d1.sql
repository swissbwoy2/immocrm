
-- Update the agent UPDATE policy to also allow co-agents to update visites for their co-assigned clients
DROP POLICY IF EXISTS "Agents can update their visites" ON visites;
CREATE POLICY "Agents can update their visites" ON visites
  FOR UPDATE
  USING (
    agent_id = get_my_agent_id()
    OR client_id IN (SELECT get_my_co_agent_client_ids())
  );
