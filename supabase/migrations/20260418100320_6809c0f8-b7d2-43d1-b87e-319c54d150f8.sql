-- Create public bucket for property photos (relouer + rénovation)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bien-photos', 'bien-photos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "bien-photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'bien-photos');

-- Authenticated users can upload to their own folder (folder name = auth.uid())
CREATE POLICY "bien-photos owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bien-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "bien-photos owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bien-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "bien-photos owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bien-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);