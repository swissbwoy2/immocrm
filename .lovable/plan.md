# Regroupement offres & visites multi-clients (UI + .ics)

## Problème
Quand une offre est envoyée à plusieurs clients pour le même bien :
- `/offres-envoyees` (admin & agent) affiche N cartes identiques (1 par client)
- `/agent/visites` & calendrier admin : N entrées de visite identiques
- Export `.ics` : N événements dupliqués dans iPhone/Google/Outlook au lieu d'1 seul avec tous les clients

## Solution : clé canonique + UID stable

### 1. Helpers partagés
**`src/utils/visitesCalculator.ts`** — ajouter :
- `buildVisiteGroupKey(adresse, date_visite)` → clé physique pour regrouper visites
- `buildOffreGroupKey(agent_id, adresse, prix, date_envoi)` → clé canonique offre
- `buildStableVisiteUID(adresse, date_visite)` → UID RFC 5545 stable `visite-{iso}-{slug}@logisorama.ch`
- `groupVisitesByPhysique<T>(visites)` → `{ key, representative, clients[], items[] }[]`
- `groupOffresByEnvoi<T>(offres)` → idem pour offres

**`src/utils/generateICS.ts`** — ajouter :
- `buildGroupedVisiteICSEvent(group)` qui construit un `ICSEventData` unique avec :
  - `uid` = `buildStableVisiteUID(...)` (stable → mises à jour fusionnées par iOS/Google)
  - `description` listant tous les clients (nom + téléphone) via `buildVisiteICSDescription`
  - `title` ex. `Visite — {adresse} ({N} clients)`

### 2. Pages offres envoyées
**`src/pages/admin/OffresEnvoyees.tsx`** & **`src/pages/agent/OffresEnvoyees.tsx`** :
- Appliquer `groupOffresByEnvoi` après le fetch
- 1 carte par groupe, badge `👥 {N} clients`
- Accordéon dépliable listant chaque client avec son statut individuel (les rows DB restent séparées pour le tracking)
- KPI compteurs basés sur groupes (déjà géré côté visites via `countUniqueOffres`, à aligner ici)
- Bouton "Calendrier" → `buildGroupedVisiteICSEvent` quand une `date_visite` existe

### 3. Visites
**`src/pages/agent/Visites.tsx`** :
- Regrouper l'affichage via `groupVisitesByPhysique`
- Export batch & bouton individuel utilisent le UID stable + description groupée

**`src/pages/admin/Calendrier.tsx`** :
- Dialog détail visite + export batch journée alignés sur UID stable + groupement

### 4. Composants calendrier
**`src/components/calendar/PremiumDayEvents.tsx`**, **`PremiumAgentDayEvents.tsx`**, **`PremiumClientDayEvents.tsx`** :
- `AddToCalendarButton` reçoit l'event groupé (déjà visuellement regroupé en UI, on aligne juste le `.ics`)

### 5. Cohérence d'insertion
**`src/components/ResendOfferDialog.tsx`** (et tout endroit qui boucle sur clients pour insérer offres/visites) :
- Pré-calculer `const now = new Date().toISOString()` AVANT la boucle
- Réutiliser exactement le même `date_envoi` et `date_visite` pour tous les inserts du batch → garantit le groupement parfait (pas d'écart de millisecondes)

## Fichiers modifiés
```
[MOD] src/utils/visitesCalculator.ts        + helpers groupement & UID
[MOD] src/utils/generateICS.ts              + buildGroupedVisiteICSEvent
[MOD] src/pages/admin/OffresEnvoyees.tsx
[MOD] src/pages/agent/OffresEnvoyees.tsx
[MOD] src/pages/agent/Visites.tsx
[MOD] src/pages/admin/Calendrier.tsx
[MOD] src/components/calendar/PremiumDayEvents.tsx
[MOD] src/components/calendar/PremiumAgentDayEvents.tsx
[MOD] src/components/calendar/PremiumClientDayEvents.tsx
[MOD] src/components/ResendOfferDialog.tsx
```

## Garanties
- ✅ Aucune migration DB : les rows individuelles restent (statuts par client, tracking, RLS inchangés)
- ✅ UID stable RFC 5545 → si vous ré-importez l'.ics, iPhone/Google met à jour au lieu de dupliquer
- ✅ Toutes les actions individuelles (relancer, marquer répondu, etc.) restent disponibles dans l'accordéon
