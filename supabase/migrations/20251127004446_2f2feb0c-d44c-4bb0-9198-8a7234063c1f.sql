-- Ajouter la colonne avatar_url à profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Créer le bucket profile-avatars (public pour affichage facile)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy pour upload : utilisateur peut gérer son propre avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');