DROP POLICY IF EXISTS "Public read marketing assets" ON storage.objects;
CREATE POLICY "Public read marketing assets"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'marketing-assets');