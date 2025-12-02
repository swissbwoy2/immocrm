-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Agents can create conversations" ON public.conversations;

CREATE POLICY "Agents can create conversations" 
ON public.conversations 
FOR INSERT 
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = conversations.agent_id::uuid 
    AND agents.user_id = auth.uid()
  )
);