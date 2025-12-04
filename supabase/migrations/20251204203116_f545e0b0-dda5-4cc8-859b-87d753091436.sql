-- Allow agents to delete their own transactions
CREATE POLICY "Agents can delete their transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.user_id = auth.uid()
    AND agents.id = transactions.agent_id
  )
);