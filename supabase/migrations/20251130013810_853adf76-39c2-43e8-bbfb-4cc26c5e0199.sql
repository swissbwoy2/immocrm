-- Add RLS policy for clients to update their own candidatures
CREATE POLICY "Clients peuvent modifier leurs candidatures" 
ON public.candidatures 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM clients 
  WHERE clients.id = candidatures.client_id 
  AND clients.user_id = auth.uid()
));