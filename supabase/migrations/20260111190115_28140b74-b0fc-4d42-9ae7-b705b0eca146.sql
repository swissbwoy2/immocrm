-- Modifier la contrainte sous_type pour accepter les types de biens
ALTER TABLE annonces_publiques DROP CONSTRAINT IF EXISTS annonces_publiques_sous_type_check;
ALTER TABLE annonces_publiques ADD CONSTRAINT annonces_publiques_sous_type_check 
CHECK (sous_type IS NULL OR sous_type = ANY (ARRAY[
  'appartement'::text, 'maison'::text, 'studio'::text, 'loft'::text, 'villa'::text, 
  'chalet'::text, 'terrain'::text, 'commerce'::text, 'bureau'::text, 'parking'::text,
  'location_longue'::text, 'location_courte'::text, 'colocation'::text, 'sous_location'::text
]));