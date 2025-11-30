-- Add policy to allow anonymous uploads to the mandat folder in client-documents bucket
CREATE POLICY "Allow anonymous uploads to mandat folder"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = 'mandat');

-- Allow public read access to mandat folder
CREATE POLICY "Allow public read access to mandat folder"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = 'mandat');