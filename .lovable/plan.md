
## Audit du module Rénovation Intelligente

### ✅ Ce qui existe et est intact
- **Pages** : `RenovationProjectsPage.tsx`, `RenovationProjectPage.tsx` (présentes dans `src/features/renovation/pages/`)
- **Composants** : 21 composants (Files, Quotes, Budget, Milestones, Companies, Incidents, Reservations, Warranties, History, Alerts, CloseProject, FinalReport, etc.) — tous présents
- **Hooks** : `useRenovationProjects`, `useRenovationProject`, `useRenovationFiles`, `useRenovationQuotes`, `useRenovationHistory` — tous présents
- **Routes dans `App.tsx`** : 
  - `/admin/renovation` + `/admin/renovation/:id` ✅
  - `/agent/renovation` + `/agent/renovation/:id` ✅
  - `/proprietaire/renovation` + `/proprietaire/renovation/:id` ✅
- **API + Edge Functions** : intactes (15 edge functions selon mémoire `renovation-intelligente-reference-version`)

### ❌ Ce qui manque — cause unique de l'invisibilité
**Le module n'a AUCUNE entrée dans le menu latéral (`AppSidebar.tsx`)** pour aucun des 3 rôles concernés.
- `case 'admin'` → pas d'entrée "Rénovation"
- `case 'agent'` → pas d'entrée "Rénovation"
- `case 'proprietaire'` → pas d'entrée "Rénovation" (seul "Projets de développement" existe, ce qui est un module différent)

Le module est donc juste **inaccessible visuellement** — il fonctionne si on tape l'URL à la main.

## Plan de restauration (PHASE 2)

Modification ciblée d'un seul fichier : `src/components/AppSidebar.tsx`

Ajout de 3 entrées de menu, une par rôle, avec icône `HardHat` (déjà importée) :

| Rôle | Libellé | Path | Position |
|---|---|---|---|
| admin | "Rénovation" | `/admin/renovation` | juste après "Projets développement" (ligne 66) |
| agent | "Rénovation" | `/agent/renovation` | juste après "Biens en vente" (ligne 82) |
| proprietaire | "Rénovation" | `/proprietaire/renovation` | juste après "Projets de développement" (ligne 136) |

Aucune `notifKey` (pas de compteur de notif rénovation pour l'instant — peut être ajouté plus tard si besoin).

## Garanties
- ✅ Aucune modification des pages/composants/hooks/routes existants — module figé respecté (cf. mémoire `renovation-intelligente-reference-version`)
- ✅ Aucun impact sur les autres dashboards
- ✅ Aucune modification UX ailleurs
- ✅ Permissions inchangées (les `ProtectedRoute` existants gèrent déjà l'accès par rôle)

## PHASE 3 — Validation
Après application, je vérifierai :
1. Sidebar affiche "Rénovation" pour admin, agent, propriétaire
2. Clic → ouvre la liste des projets
3. Clic sur un projet → ouvre la page détail avec tous les onglets (Documents, Devis, Budget, Planning, Entreprises, Incidents, Réserves, Garanties, Historique, Détails)
4. Aucun autre menu n'est cassé

## Fichier touché
- `src/components/AppSidebar.tsx` (3 lignes ajoutées)
