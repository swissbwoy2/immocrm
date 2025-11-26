-- Make the message-attachments bucket public so files can be viewed
UPDATE storage.buckets SET public = true WHERE id = 'message-attachments';

-- Create/update policies to allow authenticated users to upload and view files
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Allow anyone to view files (since bucket is now public)
CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');