

## Connecter le module Salaires aux agents et coursiers existants

### Constat
La table `employes` est actuellement isolee : aucun lien avec les tables `agents` et `coursiers`. Les agents et coursiers doivent etre importes/lies automatiquement pour eviter la double saisie.

### Modifications

**1. Migration SQL** : Ajouter une colonne `user_id` (uuid, nullable, unique) a la table `employes` pour lier un employe a un utilisateur existant (agent ou coursier).

**2. Bouton "Importer agents & coursiers"** dans `EmployesList.tsx` :
- Recupere tous les agents actifs (via `agents` + `profiles`) et coursiers actifs
- Pour chaque personne non encore presente dans `employes` (verif par `user_id`), insere un enregistrement avec les infos pre-remplies (prenom, nom, email, telephone)
- Les agents avec `is_independant = true` dans employes seront marques comme independants
- Toast de confirmation avec le nombre d'imports

**3. Enrichir `EmployeDialog.tsx`** :
- Ajouter un selecteur optionnel "Lier a un agent/coursier" qui liste les agents et coursiers non encore lies
- Quand un agent/coursier est selectionne, pre-remplit automatiquement prenom, nom, email, telephone
- Stocke le `user_id` correspondant

**4. Indicateur visuel dans `EmployesList.tsx`** :
- Badge "Agent" ou "Coursier" a cote du nom pour les employes lies
- Badge "Indépendant" pour les agents independants

### Donnees existantes
- 5 agents actifs : Gaetan Mayoraz, Thibault Depraz, Maurine Perret, Christ Ramazani, Ebenezer Batista
- 2 coursiers actifs : Guy, Coursier Un

### Fichiers concernes
- Migration SQL (ajout `user_id` a `employes`)
- `src/components/salaires/EmployesList.tsx`
- `src/components/salaires/EmployeDialog.tsx`

