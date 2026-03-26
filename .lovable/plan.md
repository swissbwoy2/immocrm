

## Rediriger l'import CSV vers la table `meta_leads`

### Problème
Les leads importés par CSV (provenant de Meta Ads) sont actuellement insérés dans la table `leads` (Leads Shortlist) au lieu de `meta_leads` (Leads Meta Ads).

### Modifications

#### 1. `supabase/functions/import-leads-csv/index.ts` — Insérer dans `meta_leads`
- Remplacer l'insertion dans `leads` par `meta_leads`
- Mapper les champs CSV vers le schéma `meta_leads` :
  - `email` → `email`
  - `prenom` → `first_name`
  - `nom` → `last_name`
  - `telephone` → `phone`
  - `source` → `source` (garder "CSV Import" ou la valeur du CSV)
  - `formulaire` → `form_name`
  - `full_name` → concaténation prenom + nom
  - `leadgen_id` → générer un ID unique (ex: `csv-import-{uuid}`) car ce champ est requis
  - `lead_status` → "new" (ou "qualified" si source = "payé")
  - `imported_at` → `new Date().toISOString()`

#### 2. `src/pages/admin/Leads.tsx` et `src/pages/closeur/Dashboard.tsx`
- Aucun changement nécessaire côté UI (l'appel à la function reste le même)
- Les leads importés apparaîtront automatiquement dans la page Meta Leads (`/admin/meta-leads`)

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/import-leads-csv/index.ts` | Insertion dans `meta_leads` au lieu de `leads`, mapping des champs |

