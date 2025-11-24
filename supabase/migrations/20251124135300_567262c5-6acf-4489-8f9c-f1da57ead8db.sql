-- Ajouter une policy pour permettre aux agents d'insérer leurs transactions
CREATE POLICY "Agents can insert their transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.agents
    WHERE agents.id = transactions.agent_id
    AND agents.user_id = auth.uid()
  )
);