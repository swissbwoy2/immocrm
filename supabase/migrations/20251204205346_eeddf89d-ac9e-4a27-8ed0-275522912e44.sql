-- Supprimer les anciennes policies restrictives
DROP POLICY IF EXISTS "Agents can update their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Agents can delete their own calendar events" ON public.calendar_events;

-- Nouvelle policy pour UPDATE : autoriser le créateur OU l'agent assigné
CREATE POLICY "Agents can update their calendar events"
ON public.calendar_events
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by 
  OR 
  (agent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = calendar_events.agent_id 
    AND agents.user_id = auth.uid()
  ))
);

-- Nouvelle policy pour DELETE : autoriser le créateur OU l'agent assigné
CREATE POLICY "Agents can delete their calendar events"
ON public.calendar_events
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by 
  OR 
  (agent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = calendar_events.agent_id 
    AND agents.user_id = auth.uid()
  ))
);