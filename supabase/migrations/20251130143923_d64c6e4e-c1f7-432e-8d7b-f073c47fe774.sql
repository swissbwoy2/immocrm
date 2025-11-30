-- Add UPDATE policies for documents table

-- Admins can update all documents (already covered by ALL policy, but adding explicit for clarity)
CREATE POLICY "Admins can update all documents" 
ON public.documents 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can update their clients' documents
CREATE POLICY "Agents can update their clients documents" 
ON public.documents 
FOR UPDATE 
USING (EXISTS (
  SELECT 1
  FROM clients c
  JOIN agents a ON a.id = c.agent_id
  WHERE c.user_id = documents.user_id 
  AND a.user_id = auth.uid()
));

-- Users can update their own documents
CREATE POLICY "Users can update their documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = user_id);