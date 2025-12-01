-- Fix infinite recursion in client_agents RLS policy
-- The problem is that the policy references client_agents within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Agents can view co-agents of their clients" ON client_agents;

-- Recreate it using the security definer function to avoid recursion
CREATE POLICY "Agents can view co-agents of their clients"
ON client_agents
FOR SELECT
USING (is_agent_of_client_via_junction(client_id));