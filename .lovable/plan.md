

# Fix : Pipeline RDV téléphonique = 0 + Adaptation mobile complète

## Diagnostic

### Bug "RDV téléphonique = 0" dans le pipeline

Vérifié en base : **7 rendez-vous existent** (6 `confirme` + 1 `en_attente`), tous avec `lead_id = NULL` mais avec un `prospect_email` qui matche correctement les leads existants. Le mapping email→lead fonctionne, donc le KPI strip affiche bien **6**.

Le **bug** est dans `src/components/admin/leads/types.ts` → fonction `getStage()` :

```ts
if (lead.is_qualified === true) return "qualifie";  // ← capture les leads qui ont un RDV
if (lead.contacted) return "contacte";              // ← idem
if (hasAppointment) return "rdv";                   // ← jamais atteint
```

Tous les 6 leads avec RDV confirmé sont déjà `contacted=true` (puisque la confirmation admin a déclenché le contact), donc ils tombent en colonne "Contacté" au lieu de "RDV téléphonique" → la colonne RDV reste vide.

### Bug `lead_id` NULL en base (cause racine)

Toutes les lignes `lead_phone_appointments` ont `lead_id = NULL`. L'UPDATE post-soumission échoue silencieusement (vraisemblablement bloqué par RLS anonyme sur UPDATE). Conséquence : tout le système repose sur le fallback `prospect_email`. Pas grave actuellement mais à corriger pour la robustesse.

### Mobile (375px–390px)

Problèmes identifiés sur la maquette actuelle :
- **Hero** : titre + segmented control + bouton "Relancer (X)" ne tiennent pas en row sur petit écran
- **KPI strip** : `grid-cols-2` OK mais valeurs `text-3xl` + label peuvent overflow
- **Filtres** : 4 selects (`w-[150px]` / `w-[170px]` / `w-[130px]`) + bouton Hot débordent largement
- **Pipeline** : `min-w-[260px]` × 5 colonnes = scroll horizontal acceptable, mais swipe pas optimisé
- **Hot carousel** : `min-w-[300px]` cards OK
- **Side panel** (`Sheet` slide-right) : ne devient pas bottom-sheet sur mobile

## Correctifs

### 1. Fix priorité "RDV téléphonique" dans le pipeline
**`src/components/admin/leads/types.ts`** — réordonner `getStage()` pour que la présence d'un RDV en `en_attente` ou `confirme` à venir batte les statuts contacted/qualified :

```ts
export function getStage(lead, hasActiveAppt, isClient) {
  if (isClient) return "client";
  if (hasActiveAppt) return "rdv";              // ← priorité absolue
  if (lead.is_qualified === true) return "qualifie";
  if (lead.contacted) return "contacte";
  return "nouveau";
}
```

Et passer **`hasActiveAppt`** (RDV `en_attente` ou `confirme`, slot futur ou < 24h passé) plutôt que "n'importe quel RDV" — pour qu'un RDV `termine` ou `annule` ne bloque pas le lead en colonne RDV indéfiniment. Logique calculée dans `LeadsPipeline.tsx`.

### 2. Fix UPDATE `lead_id` cassé
**`supabase/migrations/...`** : ajouter une **policy RLS UPDATE** anonyme sur `lead_phone_appointments` limitée à `lead_id IS NULL` (un anon peut renseigner le lien, mais ne peut pas modifier le statut, le slot, etc.) :

```sql
CREATE POLICY "anon can link lead_id once"
ON lead_phone_appointments FOR UPDATE
TO anon
USING (lead_id IS NULL)
WITH CHECK (lead_id IS NOT NULL);
```

+ trigger backfill **une seule fois** pour relier les 7 lignes existantes via `prospect_email`.

### 3. Refonte mobile complète

**`LeadsHero.tsx`** :
- Sur `<sm` : segmented control + dropdown actions sur une row, bouton "Relancer" en `w-full` row dédiée
- Pulse text wrap proprement (`flex-wrap`)

**`LeadsKpiStrip.tsx`** :
- `text-3xl` → `text-2xl sm:text-3xl`
- Label `text-xs` → `text-[10px] sm:text-xs`
- Padding réduit `p-3 sm:p-4`

**`LeadsFilters.tsx`** :
- Sur mobile : 1ère row = search (`w-full`), 2ème row = scroll horizontal (`overflow-x-auto`) avec les 3 selects + bouton Hot, chacun en `min-w-[110px] flex-shrink-0`
- Selects `text-xs` sur mobile

**`LeadsPipeline.tsx`** :
- Colonnes `min-w-[280px] sm:min-w-[260px]`, ajout `snap-x snap-mandatory` sur le scroll container + `snap-start` sur chaque colonne pour swipe naturel
- Indicateur visuel "← scroll →" sur mobile uniquement (premier load, fade après 3s)

**`LeadsListView.tsx`** :
- Vérification : déjà responsive ? Si row > 1 line sur mobile → restructurer en stack vertical : avatar + identité ligne 1 / metadata ligne 2 / RDV+actions ligne 3

**`LeadsCardsView.tsx`** :
- Grille `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (vs actuel probablement `md:grid-cols-3`)

**`LeadDetailSheet.tsx`** :
- Sur `<md` : `side="bottom"` au lieu de `side="right"`, hauteur `h-[92vh]`, header sticky, footer sticky avec actions principales

**`LeadsHotCarousel.tsx`** :
- Cards `min-w-[260px] sm:min-w-[300px]` + scroll `snap-x`
- Boutons "Confirmer" / "Appeler" en `min-h-[44px]` (touch target)

### 4. Touch targets (accessibilité mobile)
- Tous les boutons icon-only → `h-11 w-11` minimum sur mobile
- Cartes pipeline → `min-h-[80px]` pour tap confortable

## Fichiers touchés

```text
[FIX]  src/components/admin/leads/types.ts                fonction getStage réordonnée
[FIX]  src/components/admin/leads/LeadsPipeline.tsx       hasActiveAppt + snap-x mobile
[MOD]  src/components/admin/leads/LeadsHero.tsx           layout mobile
[MOD]  src/components/admin/leads/LeadsKpiStrip.tsx       tailles responsive
[MOD]  src/components/admin/leads/LeadsFilters.tsx        scroll horizontal mobile
[MOD]  src/components/admin/leads/LeadsListView.tsx       stack mobile vertical
[MOD]  src/components/admin/leads/LeadsCardsView.tsx      grid responsive
[MOD]  src/components/admin/leads/LeadDetailSheet.tsx     bottom sheet < md
[MOD]  src/components/admin/leads/LeadsHotCarousel.tsx    snap-x + touch targets
[NEW]  supabase migration                                 policy UPDATE anon + backfill lead_id
```

## Validation

1. Pipeline → colonne **RDV téléphonique** affiche bien les 6 RDV confirmés (et le pending)
2. KPI strip et colonne RDV affichent le **même nombre**
3. Lead avec RDV `confirme` + `is_qualified=true` → reste en RDV jusqu'à ce que le slot soit passé, puis bascule en "Qualifié"
4. Nouvelle soumission analyse-dossier → `lead_id` correctement renseigné en base (vérif : 0 ligne avec `lead_id IS NULL` après test)
5. Mobile 375px : aucun overflow horizontal, tous les boutons ≥44px, side panel s'ouvre en bottom-sheet
6. Pipeline en swipe fluide sur mobile (snap entre colonnes)
7. Filtres mobile : search pleine largeur + selects scrollables horizontalement sans casser le layout
8. Aucune régression desktop

