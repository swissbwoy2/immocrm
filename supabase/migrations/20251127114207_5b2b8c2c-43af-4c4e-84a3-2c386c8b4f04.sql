-- Ajouter la politique INSERT pour les agents (uploader documents pour leurs clients)
CREATE POLICY "Agents peuvent uploader documents pour leurs clients"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1
    FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE (c.user_id)::text = (storage.foldername(name))[1]
    AND a.user_id = auth.uid()
  )
);

-- Ajouter la politique DELETE pour les agents (supprimer documents de leurs clients)
CREATE POLICY "Agents peuvent supprimer documents de leurs clients"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1
    FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE (c.user_id)::text = (storage.foldername(name))[1]
    AND a.user_id = auth.uid()
  )
);

-- Ajouter politique UPDATE pour les admins
CREATE POLICY "Admins peuvent tout gérer dans client-documents"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'client-documents' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'client-documents' AND has_role(auth.uid(), 'admin'::app_role));