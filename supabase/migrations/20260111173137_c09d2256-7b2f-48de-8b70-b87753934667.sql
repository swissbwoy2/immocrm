-- Create the public-files bucket for announcements photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-files',
  'public-files', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload to public-files
CREATE POLICY "Authenticated users can upload to public-files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public-files');

-- Policy: Public read access to public-files
CREATE POLICY "Public read access to public-files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'public-files');

-- Policy: Users can delete own files in public-files
CREATE POLICY "Users can delete own files in public-files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'public-files' AND auth.uid()::text = (storage.foldername(name))[1]);