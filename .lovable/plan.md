# Candidatures déposées par l'admin → compter pour l'agent principal

## Contexte

Quand l'admin dépose une candidature via `/admin/deposer-candidature`, la candidature est bien créée en base sur le client, mais elle n'apparaît pas dans le tableau de bord de l'agent principal du client (ex. Victoria affiche 0 alors qu'elle est l'agent principal de Redouane).

## Cause identifiée

Plusieurs pages côté agent et côté admin/agent ne comptent les candidatures qu'à travers **une seule** source d'assignation :

- `src/pages/agent/Dashboard.tsx` (KPI "Candidatures") → uniquement via `client_agents`
- `src/pages/agent/Candidatures.tsx` (liste + KPIs) → uniquement via `client_agents`
- `src/pages/admin/AgentDetail.tsx` (stats du jour pour un agent) → uniquement via `clients.agent_id`, **et** bug de state stale qui rend toujours `todayStats.candidatures = 0`

Pour Redouane, Victoria est bien en agent principal **et** en `client_agents`, donc le décompte devrait marcher. Mais dès qu'un seul des deux liens manque (cas fréquent suite à un dépôt admin ou à une réassignation), le compteur tombe à 0. Il faut rendre les comptages robustes à la double source (mémoire « Dual Assignment Integrity »).

## Changements

### 1. `src/pages/agent/Dashboard.tsx`
- Lors de la récupération des clients de l'agent, faire l'**union** entre :
  - `client_agents.client_id` où `agent_id = mon agent`
  - `clients.id` où `agent_id = mon agent` (agent principal)
- Utiliser cette liste unifiée pour toutes les requêtes en aval (candidatures, documents, renouvellements, profils).

### 2. `src/pages/agent/Candidatures.tsx`
- Même union des deux sources dans `loadCandidatures()` pour que les candidatures des clients dont l'agent est principal apparaissent toujours, même sans ligne `client_agents`.

### 3. `src/pages/admin/AgentDetail.tsx`
- Étendre la requête clients à l'union `clients.agent_id` + `client_agents`.
- Corriger le bug de state stale ligne 200 : calculer `todayCandidatures` à partir de `candidaturesData` directement (variable locale) et non du state `candidatures` qui n'est pas encore mis à jour au moment du `setTodayStats`.

### 4. `src/pages/admin/DeposerCandidature.tsx`
- Après dépôt, notifier aussi l'agent principal du client (entrée `notifications` sur `agent.user_id`) pour qu'il voie immédiatement qu'une candidature a été déposée pour son client par l'admin. Texte : « L'admin a déposé une candidature pour {client} sur {adresse} ».

## Hors périmètre

- Pas de migration SQL : les données existantes sont correctes, c'est la logique de lecture qui est trop restrictive.
- Pas de changement de RLS : les policies actuelles (mises à jour précédemment) couvrent déjà principal + co.
- Pas de modification du workflow candidature → bail → clés.

## Détails techniques

L'union des deux sources se fait en TypeScript après deux requêtes parallèles :

```text
ids = unique([
  ...client_agents.select(client_id).eq(agent_id, me),
  ...clients.select(id).eq(agent_id, me),
])
```

Puis `clients.in('id', ids)` une seule fois pour récupérer les détails.
