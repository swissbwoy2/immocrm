-- Politique pour permettre aux annonceurs d'uploader dans annonces/
CREATE POLICY "Annonceurs can upload annonce photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-files' 
  AND (storage.foldername(name))[1] = 'annonces'
  AND EXISTS (
    SELECT 1 FROM public.annonceurs WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux annonceurs de mettre à jour leurs photos
CREATE POLICY "Annonceurs can update annonce photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public-files' 
  AND (storage.foldername(name))[1] = 'annonces'
  AND EXISTS (
    SELECT 1 FROM public.annonceurs WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux annonceurs de supprimer leurs photos
CREATE POLICY "Annonceurs can delete annonce photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-files' 
  AND (storage.foldername(name))[1] = 'annonces'
  AND EXISTS (
    SELECT 1 FROM public.annonceurs WHERE user_id = auth.uid()
  )
);