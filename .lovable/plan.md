

# Plan : Migration des leads CSV vers `meta_leads` + déplacement bouton import

## Contexte

- **109 leads** avec `source = 'Payé'` dans la table `leads` proviennent des imports CSV Wix (Meta Ads) : 72 "Logisorama futur" + 27 "LOGISORAMA5.0" + 5 "vendeurs vs Acheteurs" + 4 "LOGISORAMA 2.0" + 1 "NEW ACHETEUR-copy"
- La table `meta_leads` existe déjà (page `/admin/meta-ads-leads`) avec `leadgen_id NOT NULL` (clé Meta API native)
- Les ~85 leads "natifs" (`landing_quickform`, `landing_analyse_dossier`, `formulaire_vendeur_complet`, etc.) restent dans `leads`

## Architecture cible

```text
┌─────────────────────────┐         ┌─────────────────────────┐
│  /admin/leads           │         │  /admin/meta-ads-leads  │
│  Leads Shortlist        │         │  Meta Leads             │
│  (formulaires natifs)   │         │  (Meta API + CSV import)│
│                         │         │                         │
│  source ≠ 'Payé'        │         │  source = 'csv_import'  │
│                         │         │  + source = 'meta_api'  │
│  + bouton Relance       │         │  + bouton Importer CSV  │
│  + bouton Exporter      │         │  + bouton Sync Meta     │
└─────────────────────────┘         └─────────────────────────┘
```

## Étape 1 — Migration DB (one-time)

**Nouvelle migration SQL** :

1. **Migrer les 109 leads CSV** de `leads` → `meta_leads` :
   ```sql
   INSERT INTO meta_leads (
     leadgen_id, source, form_name, email, phone, first_name, last_name,
     full_name, city, lead_status, notes, imported_at, created_at,
     raw_meta_payload
   )
   SELECT
     'csv_' || l.id::text,                    -- leadgen_id synthétique unique
     'csv_import',                            -- source distincte
     l.formulaire,
     l.email, l.telephone, l.prenom, l.nom,
     trim(coalesce(l.prenom,'') || ' ' || coalesce(l.nom,'')),
     l.localite,
     CASE WHEN l.contacted THEN 'contacted'
          WHEN l.is_qualified THEN 'qualified'
          ELSE 'new' END,
     l.notes, l.created_at, l.created_at,
     jsonb_build_object('original_lead_id', l.id, 'budget', l.budget,
       'utm_source', l.utm_source, 'utm_campaign', l.utm_campaign)
   FROM leads l
   WHERE l.source = 'Payé'
   ON CONFLICT (leadgen_id) DO NOTHING;
   ```

2. **Supprimer ces leads** de la table `leads` (avec `ON DELETE CASCADE` déjà présent sur les FKs si applicable, sinon nettoyage préalable de `lead_phone_appointments`/relances) :
   ```sql
   DELETE FROM leads WHERE source = 'Payé';
   ```

3. **Modifier l'edge function `import-leads-csv`** pour pointer désormais vers `meta_leads` (insert direct avec `leadgen_id = 'csv_' || gen_random_uuid()` et `source = 'csv_import'`).

## Étape 2 — Filtrage Leads Shortlist

**`src/pages/admin/Leads.tsx`** :
- Ajouter `.neq('source', 'Payé')` dans la query principale `fetchLeads` (ceinture + bretelles, au cas où des anciens resteraient ou pour leads manuels marqués 'Payé')
- Retirer le bouton "Importer CSV" du `LeadsHero` (prop `onImport={undefined}`)
- Supprimer le state `showImportDialog`, `importFile`, `importing` et le JSX du Dialog d'import
- Supprimer la fonction `handleImportCSV` (déplacée dans MetaLeads)

**`src/components/admin/leads/LeadsHero.tsx`** : conditionnel — afficher le bouton Import seulement si `onImport` est défini (déjà le cas via prop optionnelle).

## Étape 3 — Bouton Import CSV dans MetaLeads

**`src/pages/admin/MetaLeads.tsx`** :
- Ajouter un bouton "Importer CSV" dans le header (à côté de "Sync Meta")
- Déplacer le Dialog d'import (extraction CSV + parsing Wix) depuis `Leads.tsx`
- Modifier l'appel à `import-leads-csv` (ou un nouveau `import-meta-leads-csv`) pour insérer dans `meta_leads` au lieu de `leads`
- Refresh `fetchLeads()` après import

**Edge Function `import-leads-csv`** : refactor pour insérer dans `meta_leads` :
- Génère `leadgen_id = 'csv_' || crypto.randomUUID()` 
- `source = 'csv_import'`
- Map `formulaire_name` → `form_name`
- Conserve la déduplication par `email` (vérifier si email déjà présent dans `meta_leads`)

## Étape 4 — Validation

1. La query `SELECT count(*) FROM leads WHERE source='Payé'` retourne **0** après migration
2. La query `SELECT count(*) FROM meta_leads WHERE source='csv_import'` retourne **109**
3. La page `/admin/leads` n'affiche plus que les leads des formulaires natifs (~85)
4. La page `/admin/meta-ads-leads` affiche les 109 leads CSV migrés + leads Meta API natifs
5. Le bouton "Importer CSV" est visible dans `/admin/meta-ads-leads` et fonctionnel
6. Le bouton "Importer CSV" a disparu de `/admin/leads`
7. Aucune perte de données (notes, contacted status préservés via `lead_status` mapping)
8. Les KPI/Pipeline de Leads Shortlist se rechargent avec les bons compteurs

## Fichiers touchés

```text
[NEW] supabase/migrations/...                    Migration leads → meta_leads + DELETE
[MOD] src/pages/admin/Leads.tsx                  Filtre source≠'Payé' + retire import dialog
[MOD] src/pages/admin/MetaLeads.tsx              Ajoute bouton + dialog import CSV
[MOD] supabase/functions/import-leads-csv/...    Insert dans meta_leads au lieu de leads
[MOD] src/components/admin/leads/LeadsHero.tsx   Vérif: bouton Import optionnel (déjà OK)
```

## Notes techniques

- **Pas de perte de données** : `notes`, `contacted`, `is_qualified` mappés vers `lead_status` ; `budget` et UTM stockés dans `raw_meta_payload`
- **Idempotence** : `ON CONFLICT (leadgen_id) DO NOTHING` permet de relancer la migration sans risque
- **Cascade FK** : si `lead_phone_appointments.lead_id` référence ces leads, on conserve les appointments (ils continuent à matcher via `prospect_email`) mais on doit `SET NULL` avant DELETE
- **Pas de modif RLS** : les policies existantes de `meta_leads` (admin only) restent valides

