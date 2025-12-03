-- Enable RLS on client_notes table
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all client notes
CREATE POLICY "Admins can manage all client notes"
ON public.client_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can manage notes they created
CREATE POLICY "Agents can manage their own notes"
ON public.client_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = client_notes.agent_id
    AND a.user_id = auth.uid()
  )
);

-- Agents can view notes of clients they are assigned to (via client_agents)
CREATE POLICY "Agents can view notes of their assigned clients"
ON public.client_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = client_notes.client_id
    AND a.user_id = auth.uid()
  )
);