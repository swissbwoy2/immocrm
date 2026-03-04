

## Corriger les doublons lors du ré-export ICS

### Problème
`generateUID()` dans `src/utils/generateICS.ts` produit un UID aléatoire à chaque appel. Les apps calendrier (iPhone, Google, Outlook) considèrent chaque UID comme un événement distinct → doublons à chaque ré-export.

### Solution
Rendre le UID déterministe en le basant sur un identifiant stable (l'ID de la visite en base).

#### Modifications :

1. **`src/utils/generateICS.ts`**
   - Ajouter un champ optionnel `uid?: string` à `ICSEventData`
   - Dans `generateICSContent` et `generateMultiEventICSContent`, utiliser `event.uid` s'il est fourni, sinon fallback sur `generateUID()` (rétrocompatibilité)

2. **`src/pages/admin/Calendrier.tsx`** — Dans le batch export ET le bouton individuel, passer `uid: visite.id + '@immocrm'` dans l'objet `ICSEventData`

3. **`src/pages/agent/Visites.tsx`** — Idem pour les exports agent (batch + individuel)

4. **`src/components/calendar/PremiumAgentDayEvents.tsx`** et **`PremiumClientDayEvents.tsx`** — Passer le `uid` basé sur l'ID visite

### Résultat
Un même événement exporté deux fois aura le même UID → les apps calendrier le mettent à jour au lieu de le dupliquer.

