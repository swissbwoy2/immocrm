-- Lot 2: Élargir les buckets storage à 1 GB et autoriser les vidéos mobiles
UPDATE storage.buckets
SET file_size_limit = 1073741824,
    allowed_mime_types = ARRAY[
      'image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif','image/gif',
      'video/mp4','video/quicktime','video/3gpp','video/3gpp2','video/webm','video/x-m4v',
      'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/wav',
      'application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain','text/csv'
    ]
WHERE id IN ('visite-medias','bien-medias','message-attachments');

-- Index pour requête cron des comptes-rendus en retard
CREATE INDEX IF NOT EXISTS idx_visites_statut_date ON public.visites(statut, date_visite);