CREATE POLICY "vmedias coursiers write own missions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'visite-medias'
  AND NOT public.is_demo_account(auth.uid())
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.is_coursier_of_visite(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "vmedias coursiers update own missions"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'visite-medias'
  AND NOT public.is_demo_account(auth.uid())
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.is_coursier_of_visite(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'visite-medias'
  AND NOT public.is_demo_account(auth.uid())
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.is_coursier_of_visite(((storage.foldername(name))[1])::uuid)
);