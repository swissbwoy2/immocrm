
# Problème : L'admin voit 2 clients pour Carina au lieu de 6

## Cause identifiée

Il y a **2 problèmes combinés** :

### 1. Désynchronisation de données dans la base

4 clients de Carina ont leur `agent_id` qui pointe encore vers **Christ Ramazani** dans la table `clients`, alors qu'ils sont correctement liés à Carina dans `client_agents` :

| Client | `clients.agent_id` | `client_agents` |
|---|---|---|
| Guelda IRAKOZE | ✅ Carina | ✅ Carina |
| Léa Davoudi | ✅ Carina | ✅ Carina |
| Voncicia Romela Ngoma | ❌ Christ Ramazani | ✅ Carina |
| Bintou Ndiaye | ❌ Christ Ramazani | ✅ Carina |
| Formoso Ualo | ❌ Christ Ramazani | ✅ Carina |
| Alicem Demir | ❌ Christ Ramazani | ✅ Carina |

### 2. La requête dans Agents.tsx utilise la mauvaise source

```typescript
// PROBLÈME : compte via clients.agent_id (colonne directe)
.select('id, user_id, statut, clients(count)')

// CORRECT : devrait compter via client_agents (table de liaison)
```

La page admin Agents.tsx compte les clients via la relation directe `clients.agent_id`, ce qui exclut tous les clients co-assignés ou réassignés via `client_agents`.

## Solution en 2 étapes

### Étape 1 : Corriger les données (mise à jour SQL)

Mettre à jour `clients.agent_id` pour les 4 clients désynchronisés afin qu'ils pointent vers Carina. La requête vérifée en base confirme les IDs :

```sql
UPDATE clients
SET agent_id = '67f3a2c5-c890-424f-8d3e-bdf2cf470d78'  -- Carina Tavares
WHERE id IN (
  'bde09837-19a7-4bf3-8d57-271b1539dd5a',  -- Voncicia Romela Ngoma
  '81741e25-b8b1-4269-bd4f-b293d7a65117',  -- Bintou Ndiaye
  '18f30241-deb0-433b-ba94-67366875df05',  -- Formoso Ualo
  'd41de71b-c122-4f89-9bf4-021ba4a168aa'   -- Alicem Demir
);
```

### Étape 2 : Corriger la requête dans Agents.tsx

Modifier `fetchAgents()` pour compter les clients via `client_agents` (source de vérité) plutôt que via `clients(count)` (colonne directe souvent désynchronisée). Cela rendra le comptage robuste pour tous les cas futurs (co-assignation, réassignation, etc.).

La nouvelle approche : récupérer les agents, puis faire une requête séparée sur `client_agents` pour compter les clients actifs par agent.

```typescript
// Nouvelle requête : count via client_agents + filtre statut != reloge
const { data: clientCounts } = await supabase
  .from('client_agents')
  .select('agent_id, clients!inner(statut)')
  .neq('clients.statut', 'reloge');
```

## Fichiers impactés

| Action | Fichier |
|---|---|
| Mise à jour SQL des 4 clients | Migration SQL (data fix) |
| Correction de la requête | `src/pages/admin/Agents.tsx` |

## Résultat attendu

Après correction, l'admin verra **6 clients** pour Carina dans la liste des agents, cohérent avec le tableau de bord de Carina.
