-- Add policy for admins to manage all avatars in profile-avatars bucket
CREATE POLICY "Admins can manage all avatars"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'profile-avatars' 
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND has_role(auth.uid(), 'admin')
);