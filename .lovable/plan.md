

# Correction de l'affichage des noms de coursiers (Admin + Agent)

## Probleme identifie

Les colonnes `prenom`, `nom`, `email` de la table `coursiers` sont **vides** pour tous les coursiers existants. Les donnees sont stockees dans la table `profiles` (liee via `user_id`), mais le code affiche directement les champs de `coursiers`.

**Cause racine** : L'edge function `create-coursier` cree bien le profil dans `profiles` avec prenom/nom/email, mais insere un enregistrement `coursiers` avec seulement `user_id` et `statut`. Les colonnes redondantes `prenom/nom/email` de `coursiers` restent vides.

## Solution

Deux corrections complementaires :

### 1. Modifier la requete dans `AdminCoursiers` (page admin)

**Fichier** : `src/pages/admin/Coursiers.tsx`

Actuellement (ligne 30) :
```
supabase.from('coursiers').select('*')
```

Remplacer par :
```
supabase.from('coursiers').select('*, profiles:user_id(prenom, nom, email, telephone)')
```

Puis mettre a jour l'affichage (lignes 253-257) pour utiliser `c.profiles?.prenom` au lieu de `c.prenom`, avec fallback sur les champs directs de `coursiers` :
```
{c.profiles?.prenom || c.prenom} {c.profiles?.nom || c.nom}
```

Idem pour l'initiale dans l'avatar et la ligne email/telephone.

### 2. Corriger l'edge function `create-coursier`

**Fichier** : `supabase/functions/create-coursier/index.ts`

Ajouter les champs `prenom`, `nom`, `email`, `telephone` lors de l'insertion dans la table `coursiers` pour que les donnees soient aussi disponibles directement :

```typescript
.from("coursiers")
.insert({
  user_id: authData.user.id,
  statut: "en_attente",
  prenom,
  nom,
  email,
  telephone,
})
```

### 3. Corriger les 2 coursiers existants (migration SQL)

Executer une migration pour remplir les colonnes vides a partir de `profiles` :

```sql
UPDATE coursiers c
SET
  prenom = p.prenom,
  nom = p.nom,
  email = p.email,
  telephone = p.telephone
FROM profiles p
WHERE c.user_id = p.id
AND (c.prenom IS NULL OR c.prenom = '');
```

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/admin/Coursiers.tsx` | Jointure `profiles` dans la requete + affichage avec fallback |
| `supabase/functions/create-coursier/index.ts` | Ajout prenom/nom/email/telephone a l'insert coursiers |
| Migration SQL | Mise a jour des 2 coursiers existants |

