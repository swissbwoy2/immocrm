
-- Fix existing leads: set type_recherche based on formulaire name
UPDATE leads SET type_recherche = 'Acheter'
WHERE type_recherche IS NULL 
AND formulaire IS NOT NULL 
AND (lower(formulaire) LIKE '%acheteur%' OR lower(formulaire) LIKE '%acheter%' OR lower(formulaire) LIKE '%achat%');

UPDATE leads SET type_recherche = 'Vendre'
WHERE type_recherche IS NULL 
AND formulaire IS NOT NULL 
AND (lower(formulaire) LIKE '%vendeur%' OR lower(formulaire) LIKE '%vendre%' OR lower(formulaire) LIKE '%estimation%' OR lower(formulaire) LIKE '%mandat%');

UPDATE leads SET type_recherche = 'Louer'
WHERE type_recherche IS NULL;

-- Fix existing leads: set is_qualified based on source
UPDATE leads SET is_qualified = true
WHERE is_qualified IS NULL 
AND source IS NOT NULL 
AND lower(source) = 'payé';
