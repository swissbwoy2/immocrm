## Problème

Carina affiche 22 clients alors qu'elle n'en a que 13 actifs. La requête actuelle filtre seulement `statut <> 'reloge'`, ce qui inclut aussi les clients `inactif` (8) et `suspendu` (1) → 13 + 8 + 1 = 22.

Répartition réelle en base pour Carina :
- actif : 13
- inactif : 8
- suspendu : 1
- reloge : 1

## Décision

Compter uniquement les clients au statut `actif` partout où on affiche un nombre de clients par agent.

## Changements

1. **`src/pages/admin/Agents.tsx`** (liste des agents, KPI "Actifs", badge par carte) — remplacer `.neq('clients.statut', 'reloge')` par `.eq('clients.statut', 'actif')`.

2. **`src/pages/admin/AgentDetail.tsx`** — la requête `client_agents` qui alimente la liste et le badge `{clients.length}` doit elle aussi filtrer `clients.statut = 'actif'` au lieu de `<> 'reloge'`. Cela impactera également la projection financière, qui ne prendra plus en compte que les mandats actifs (cohérent avec l'intention du KPI).

3. **`src/pages/admin/StatistiquesAgents.tsx`** — même changement pour le `total_clients`.

Aucun changement de schéma ni de RLS, uniquement la logique de filtrage côté requête.
