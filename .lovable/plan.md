# Diagnostic
La page `/admin/suivi-extraits` affiche **0 partout** parce que la requête Supabase échoue silencieusement.

**Cause racine** : `SuiviExtraitsPoursuites.tsx` (ligne 82-94) sélectionne `prenom, nom, email` directement sur la table `clients`, mais **ces colonnes n'existent pas** sur `clients` — elles vivent dans la table `profiles` (jointe via `clients.user_id = profiles.id`).

PostgREST renvoie une erreur 400 (`column "prenom" does not exist`), `data` est `null`, donc `rows = []` et tous les KPI valent 0.

Vérifié en base :
- 48 clients avec `statut = 'actif'` existent ✅
- 1 a déjà un `extrait_poursuites_document_id` rempli ✅
- Colonnes identité présentes uniquement sur `profiles(id, prenom, nom, email)` ✅

# Correctif proposé

Modifier la requête `load()` dans `src/pages/admin/SuiviExtraitsPoursuites.tsx` pour :

1. **Retirer `prenom, nom, email`** du select sur `clients`.
2. **Ajouter une jointure embed** vers `profiles` :
   ```ts
   profile:profiles!clients_user_id_fkey ( prenom, nom, email )
   ```
   (avec fallback sur le nom de FK exact si différent — à vérifier via `pg_constraint`).
3. **Mapper** `c.profile?.prenom`, `c.profile?.nom`, `c.profile?.email` dans la transformation `Row`.
4. **Ajouter `console.error` + toast plus visible** quand la query échoue, pour ne plus jamais avoir un écran vide silencieux.
5. **Rendre l'embed `source_document` tolérant** : garder la syntaxe avec nom de FK qui fonctionne, mais ajouter `!left` si nécessaire pour éviter qu'un document supprimé ne casse la requête.

# Test après fix
- Recharger `/admin/suivi-extraits` → KPI "Clients actifs" doit afficher **48**.
- "Manquants" devrait afficher **47** (1 seul a un document source pour l'instant).
- Vérifier qu'un nom/email s'affiche bien dans la colonne "Client".
- Vérifier le bouton "Document source" sur le client qui a un PDF lié.

# Fichiers impactés
- `src/pages/admin/SuiviExtraitsPoursuites.tsx` (uniquement la fonction `load()` + le mapping)

Aucune migration SQL nécessaire.
