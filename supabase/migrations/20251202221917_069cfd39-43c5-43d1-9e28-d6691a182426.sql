-- Drop and recreate the agent insert policy with proper type handling
DROP POLICY IF EXISTS "Agents can create conversations" ON public.conversations;

CREATE POLICY "Agents can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = conversations.agent_id::uuid 
    AND agents.user_id = auth.uid()
  )
);