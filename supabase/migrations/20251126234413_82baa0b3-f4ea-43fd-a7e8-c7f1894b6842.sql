-- Supprimer les anciennes politiques restrictives sur message-attachments
DROP POLICY IF EXISTS "Agents can upload in their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload in their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to message-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to message-attachments" ON storage.objects;

-- Politique simple : tous les utilisateurs authentifiés peuvent uploader dans message-attachments
CREATE POLICY "Authenticated users can upload to message-attachments" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'message-attachments');

-- Lecture publique pour message-attachments (bucket est déjà public)
CREATE POLICY "Public read access to message-attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-attachments');