
# Problème : Guelda reste dans la liste des clients de Carina après suppression

## Cause racine identifiée

Le lien entre Guelda et Carina n'existe **pas dans `client_agents`** (la table junction moderne) — il n'existe que via le champ legacy `agent_id` directement sur la table `clients` :

| Table | Valeur |
|---|---|
| `clients.agent_id` pour Guelda | `67f3a2c5` (= Carina) ✅ présent |
| `client_agents` pour Guelda + Carina | **0 enregistrements** ❌ absent |

Quand l'interface essaie de retirer Carina de la liste de clients, elle supprime uniquement dans `client_agents` — mais comme l'entrée n'y est pas, rien ne se passe. Le champ `clients.agent_id = Carina` reste intact, donc Guelda continue d'apparaître dans la liste de Carina.

## Solution en deux parties

### Partie 1 — Corriger la désassignation dans l'interface

Dans la page `ClientDetail.tsx`, la fonction de désassignation d'un agent (bouton "Retirer l'agent") doit également mettre `clients.agent_id` à `null` quand c'est l'agent principal qui est retiré, en plus de supprimer dans `client_agents`.

### Partie 2 — Corriger le problème immédiat de Guelda

Via une mise à jour directe en base : mettre `agent_id = NULL` sur l'enregistrement client de Guelda (`id = 3e8dfba6-eca3-4cc5-82ee-2528dc8249a7`), pour couper le lien avec Carina.

La conversation est déjà archivée (`is_archived: true`), donc elle ne sera pas visible dans la messagerie. Pas besoin de toucher à la conversation.

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/pages/admin/ClientDetail.tsx` | Dans la fonction de retrait d'agent, ajouter la mise à null de `clients.agent_id` si c'était l'agent primaire |
| `src/pages/admin/Assignations.tsx` | Même correction dans `handleEditAssignment` : s'assurer que `clients.agent_id` est mis à null quand tous les agents sont retirés ou que l'agent primaire change |

## Correction immédiate (base de données)

Mettre `agent_id = NULL` pour Guelda dans la table `clients` pour rompre immédiatement le lien avec Carina.

## Résultat attendu

- Guelda n'apparaît plus dans la liste des clients de Carina
- Toute future désassignation via l'interface fonctionnera correctement en mettant à jour les deux sources (`client_agents` ET `clients.agent_id`)
