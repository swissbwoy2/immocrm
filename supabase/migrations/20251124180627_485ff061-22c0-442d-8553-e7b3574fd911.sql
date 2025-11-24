-- Permettre aux clients de créer des visites déléguées
CREATE POLICY "Clients can insert delegated visites"
ON public.visites
FOR INSERT
WITH CHECK (
  est_deleguee = true 
  AND EXISTS (
    SELECT 1 
    FROM public.clients 
    WHERE clients.id = visites.client_id 
    AND clients.user_id = auth.uid()
  )
);