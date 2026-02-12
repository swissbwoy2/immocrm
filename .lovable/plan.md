

# Fix: Affichage des 2 coursiers inscrits

## Probleme

La jointure `profiles:user_id(...)` dans la requete Supabase ne fonctionne pas car il manque la **cle etrangere** entre `coursiers.user_id` et `profiles.id` dans la base de donnees. PostgREST a besoin de cette relation pour resoudre la jointure.

## Solution : Migration SQL uniquement

Une seule migration SQL qui fait 2 choses :

### 1. Ajouter la cle etrangere manquante

```sql
ALTER TABLE coursiers 
ADD CONSTRAINT coursiers_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id);
```

Cela permet a la requete `.select('*, profiles:user_id(...)')` de fonctionner correctement.

### 2. Remplir les colonnes vides des 2 coursiers existants

```sql
UPDATE coursiers c
SET prenom = p.prenom, nom = p.nom, email = p.email, telephone = p.telephone
FROM profiles p
WHERE c.user_id = p.id
AND (c.prenom IS NULL OR c.prenom = '');
```

## Aucun changement de code

Le code frontend et l'edge function sont deja corrects depuis la derniere modification. Une fois la migration executee, les 2 coursiers s'afficheront immediatement avec leurs noms.

