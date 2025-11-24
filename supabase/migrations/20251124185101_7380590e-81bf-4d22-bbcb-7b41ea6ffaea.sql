-- Créer les RLS policies pour le bucket client-documents
-- Note: Les policies existantes seront remplacées si elles ont le même nom

-- Permettre aux admins de voir tous les documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Permettre aux agents de voir les documents de leurs clients
CREATE POLICY "Agents can view their clients documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND (
    -- L'agent peut voir les documents des clients qui lui sont assignés
    -- Le storage path est de type: user_id/category/filename
    (storage.foldername(name))[1]::uuid IN (
      SELECT c.user_id 
      FROM clients c
      JOIN agents a ON a.id = c.agent_id
      WHERE a.user_id = auth.uid()
    )
  )
);

-- Permettre aux clients de voir leurs propres documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

-- Permettre aux admins de gérer tous les documents (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Permettre aux clients d'uploader leurs propres documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

-- Permettre aux clients de supprimer leurs propres documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);