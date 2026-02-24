-- Allow agents to ALWAYS see offres they created, even after client reassignment
CREATE POLICY "Agents can view their own created offres"
ON offres FOR SELECT
USING (agent_id = get_my_agent_id());
