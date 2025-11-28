-- Permettre aux clients de voir les documents où ils sont le client_id (même si uploadés par admin/agent)
CREATE POLICY "Clients can view documents where they are client"
ON public.documents
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- Permettre aux admins d'insérer des documents pour n'importe quel client
CREATE POLICY "Admins can insert documents for any client"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Permettre aux admins de supprimer des documents
CREATE POLICY "Admins can delete any documents"
ON public.documents
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));