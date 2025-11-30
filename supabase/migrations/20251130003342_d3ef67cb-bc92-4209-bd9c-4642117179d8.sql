-- Policy pour permettre aux agents d'insérer des candidatures pour leurs clients
CREATE POLICY "Agents peuvent créer candidatures pour leurs clients"
ON public.candidatures
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = candidatures.client_id
    AND a.user_id = auth.uid()
  )
);

-- Policy pour permettre aux agents de modifier les candidatures de leurs clients
CREATE POLICY "Agents peuvent modifier candidatures de leurs clients"
ON public.candidatures
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = candidatures.client_id
    AND a.user_id = auth.uid()
  )
);