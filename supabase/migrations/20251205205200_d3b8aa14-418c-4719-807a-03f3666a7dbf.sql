-- Ajouter une colonne medias (jsonb) à la table visites pour stocker les photos/vidéos de visite
ALTER TABLE visites ADD COLUMN IF NOT EXISTS medias jsonb DEFAULT '[]'::jsonb;

-- Structure des médias :
-- [
--   { "url": "path/to/file", "type": "image/jpeg", "name": "photo1.jpg", "size": 12345 },
--   { "url": "path/to/video", "type": "video/mp4", "name": "visite.mp4", "size": 5000000 }
-- ]

COMMENT ON COLUMN visites.medias IS 'Photos et vidéos de la visite uploadées par l''agent comme feedback visuel';