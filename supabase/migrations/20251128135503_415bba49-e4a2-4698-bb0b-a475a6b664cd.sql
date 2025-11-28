-- Permettre aux clients de supprimer les documents de leur dossier
CREATE POLICY "Clients can delete documents where they are client"
ON public.documents
FOR DELETE
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);