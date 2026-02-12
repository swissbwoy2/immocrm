-- 1. Ajouter la clé étrangère manquante
ALTER TABLE coursiers 
ADD CONSTRAINT coursiers_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id);

-- 2. Remplir les colonnes vides des 2 coursiers existants
UPDATE coursiers c
SET prenom = p.prenom, nom = p.nom, email = p.email, telephone = p.telephone
FROM profiles p
WHERE c.user_id = p.id
AND (c.prenom IS NULL OR c.prenom = '');