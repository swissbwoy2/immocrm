-- Add parcours_type column to profiles to distinguish user journeys
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS parcours_type TEXT DEFAULT 'location';

-- Backfill: repair Cendrine (renovation) and any other orphans by source from auth metadata
UPDATE public.profiles p
SET parcours_type = CASE
  WHEN (u.raw_user_meta_data->>'user_type') = 'maitre_ouvrage' THEN 'renovation'
  WHEN (u.raw_user_meta_data->>'user_type') = 'proprietaire_vendeur' THEN 'vente'
  WHEN (u.raw_user_meta_data->>'user_type') = 'proprietaire_bailleur' THEN 'relocation'
  ELSE COALESCE(p.parcours_type, 'location')
END
FROM auth.users u
WHERE u.id = p.id
  AND (p.parcours_type IS NULL OR p.parcours_type = 'location')
  AND (u.raw_user_meta_data->>'user_type') IN ('maitre_ouvrage', 'proprietaire_vendeur', 'proprietaire_bailleur');