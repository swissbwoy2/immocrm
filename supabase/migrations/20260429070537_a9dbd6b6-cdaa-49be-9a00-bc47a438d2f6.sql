-- Bucket public pour les vidéos de formation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'formation-videos',
  'formation-videos',
  true,
  104857600, -- 100 MB
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique
CREATE POLICY "Formation videos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'formation-videos');

-- Upload réservé aux admins
CREATE POLICY "Admins can upload formation videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'formation-videos'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Modification réservée aux admins
CREATE POLICY "Admins can update formation videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'formation-videos'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Suppression réservée aux admins
CREATE POLICY "Admins can delete formation videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'formation-videos'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);