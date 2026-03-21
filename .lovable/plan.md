

## Correction : Leads importés affichés "Non qualifié" alors qu'ils sont qualifiés

### Probleme identifié

Deux bugs combinés :

1. **L'import CSV force `is_qualified: null`** (ligne 80 du edge function) — tous les leads importés arrivent sans statut de qualification
2. **L'affichage traite `null` comme "Non qualifié"** (badge rouge) — alors que `null` devrait signifier "À évaluer" (pas encore qualifié, pas non qualifié)

Le CSV Wix contient une colonne **Source** avec la valeur "Payé" (lead payant = qualifié) et une colonne **Formulaire** qui est bien mappée.

### Corrections

#### 1. Edge function `import-leads-csv/index.ts`
- Si `source === "Payé"` → mettre `is_qualified: true` (lead payant = qualifié)
- Sinon laisser `null` (à évaluer)

#### 2. Affichage dans `Leads.tsx` — Gestion du statut `null`
- `is_qualified === true` → Badge vert "Qualifié"
- `is_qualified === false` → Badge rouge "Non qualifié"  
- `is_qualified === null` → Badge gris/jaune "À évaluer" (nouveau)

#### 3. Filtre "À évaluer" dans les filtres
- Ajouter une option "À évaluer" dans le SelectFilter pour voir les leads pas encore triés

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/import-leads-csv/index.ts` | Qualifier automatiquement les leads "Payé" |
| `src/pages/admin/Leads.tsx` | Ajouter le statut "À évaluer" (null) avec badge jaune + filtre |
| `src/pages/closeur/Dashboard.tsx` | Même correction d'affichage si applicable |

