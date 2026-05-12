
## Constat (vérifié en DB)

| Agent | `clients.agent_id` (legacy) | `client_agents` (source de vérité) | Detail affiche | Liste affiche |
|---|---|---|---|---|
| Carina | **22** (dont 1 reloge → 23 brut) | **14** | 23 ❌ | 14 ✅ |
| Elodie | **9** | **13** | 9 ❌ | 13 ✅ |
| Victoria | 14 | 14 | 14 ✅ | 14 ✅ |

Deux problèmes :
1. **AgentDetail.tsx** lit la table legacy `clients.agent_id` au lieu de `client_agents` → compte faux et inclut même les clients `reloge`.
2. **Drift réel des données** entre `clients.agent_id` et `client_agents` (mémoire « Always keep client_agents and clients.agent_id in sync » violée pour Carina et Elodie). Carina a 13 lignes orphelines `agent_id=Carina` sans entrée `client_agents`, Elodie a l'inverse (4 co/primaires côté `client_agents` sans `agent_id` correspondant).

## Plan

### 1. Corriger l'affichage du detail agent (`src/pages/admin/AgentDetail.tsx`, lignes 213-244)

Remplacer la requête actuelle :
```ts
.from('clients').select('*').eq('agent_id', agentId);
```
par :
```ts
.from('client_agents')
  .select('is_primary, commission_split, clients!inner(*)')
  .eq('agent_id', agentId)
  .neq('clients.statut', 'reloge')
  .limit(15000);
```
Mapper `data.map(r => ({ ...r.clients, is_primary: r.is_primary, commission_split: r.commission_split }))`. Le compteur `clients.length` (lignes 698 et 790) devient cohérent avec la liste `/admin/agents` et la page Assignations.

Bonus UI : sur la carte client (ligne 810), afficher un petit badge `Co-agent` quand `!is_primary` pour distinguer visuellement les co-assignations dans le portefeuille de l'agent.

### 2. Re-sync one-shot des données (migration SQL)

Source de vérité retenue : **`client_agents`** (c'est elle qui pilote l'UI Assignations refondue, les RLS co-assignment et l'access control storage).

Migration en deux passes :

**Passe A — combler les trous dans `client_agents`** : pour chaque ligne `clients` ayant `agent_id IS NOT NULL` mais aucune ligne dans `client_agents`, insérer `(client_id, agent_id, is_primary=true, commission_split=100)`. Couvre les 13 orphelins de Carina.

**Passe B — réaligner `clients.agent_id`** : pour chaque client présent dans `client_agents`, mettre `clients.agent_id = (la ligne is_primary=true)`. Si plusieurs `is_primary=true` (ne devrait pas arriver), garder la plus ancienne et passer les autres à `false`. Si aucun primaire mais des co-agents, promouvoir le plus ancien.

**Passe C — recompter le cache** : `UPDATE agents SET nombre_clients_assignes = (SELECT count(*) FROM client_agents ca JOIN clients c ON c.id=ca.client_id WHERE ca.agent_id=agents.id AND c.statut<>'reloge')` pour aligner aussi le compteur dénormalisé utilisé ailleurs (KPI, badges).

Aucune suppression de données. Aucun changement de RLS ni d'Edge Function.

### 3. Aucune autre page touchée

`/admin/agents` (liste) lit déjà `client_agents` correctement → pas de modif. La page Assignations refondue lit déjà `client_agents` → pas de modif.

## Question

OK pour exécuter la migration de resync (Passes A+B+C ci-dessus) en plus du fix d'affichage ? C'est elle qui résout définitivement le drift — sinon le compteur sera juste à l'écran mais Carina restera avec 13 clients « fantômes » uniquement reliés via `agent_id` legacy.
