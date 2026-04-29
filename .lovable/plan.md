## Objectif

Donner aux **agents co-assignés** (table `client_agents`) **exactement les mêmes droits à 100%** que l'agent principal (`clients.agent_id`), partout dans l'application — messagerie, conversations, candidats, documents, et toute action liée à un client partagé.

## Diagnostic

J'ai inspecté toutes les RLS policies pertinentes. Voici ce qui bloque les co-agents aujourd'hui :

### Tables bloquantes (à corriger)

| Table | Policy fautive | Problème |
|---|---|---|
| `client_candidates` | "Agents can manage candidates of their clients" (ALL) | Vérifie uniquement `clients.agent_id`. Les co-agents ne peuvent **pas ajouter/modifier/supprimer** de co-candidats. |
| `documents` | "Agents can manage candidate documents" (ALL) | Vérifie uniquement `clients.agent_id` via la chaîne `client_candidates → clients`. Les co-agents ne peuvent **pas gérer les pièces jointes** des candidats. |
| `messages` (INSERT) | "Users multi can insert messages..." | Vérifie `conversation_agents`. Si la conversation auto-créée par le trigger `sync_client_agent_on_assignment` n'a inscrit que l'agent principal dans `conversation_agents`, le co-agent **ne peut pas envoyer** de message. |
| Trigger `sync_client_agent_on_assignment` | — | Crée bien la conversation pour l'agent principal mais **ne crée pas** automatiquement une entrée `conversation_agents` pour les co-agents existants ni quand un co-agent est ajouté plus tard. |

### Déjà OK (vérifié)

- `conversations` INSERT : `can_agent_create_conversation` accepte déjà les co-agents (utilise `client_agents`).
- `candidatures` : policy "Agents multi peuvent gérer candidatures" couvre déjà co-agents.
- `offres` : toutes les policies multi-agents existent déjà.
- `visites` : `get_my_co_agent_client_ids()` couvre les co-agents en SELECT/UPDATE.
- `clients` : `is_agent_of_client()` vérifie déjà les deux sources.
- `documents` (côté client_id) : déjà OK pour co-agents.
- `client_notes` : chaque agent gère ses propres notes (logique normale).

## Plan d'action (migration SQL unique)

### 1. Élargir RLS sur `client_candidates`

Remplacer la policy ALL existante pour qu'elle accepte aussi les co-agents via `client_agents` :

```sql
DROP POLICY "Agents can manage candidates of their clients" ON client_candidates;

CREATE POLICY "Agents (principal + co) can manage candidates"
ON client_candidates FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM clients c JOIN agents a ON a.id = c.agent_id
          WHERE c.id = client_candidates.client_id AND a.user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM client_agents ca JOIN agents a ON a.id = ca.agent_id
          WHERE ca.client_id = client_candidates.client_id AND a.user_id = auth.uid())
)
WITH CHECK (... même condition ...);
```

### 2. Élargir RLS sur `documents` (candidate_id)

Remplacer "Agents can manage candidate documents" pour inclure les co-agents.

### 3. Garantir l'inscription des co-agents dans `conversation_agents`

Deux corrections au trigger `sync_client_agent_on_assignment` :
- Quand un co-agent est ajouté dans `client_agents`, créer un trigger AFTER INSERT qui ajoute automatiquement le co-agent à `conversation_agents` pour toutes les conversations existantes du client.
- Backfill ponctuel : pour tous les couples (co-agent, conversation) déjà existants, insérer les lignes manquantes dans `conversation_agents`.

```sql
-- Nouveau trigger
CREATE OR REPLACE FUNCTION sync_co_agent_to_conversations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO conversation_agents (conversation_id, agent_id)
  SELECT conv.id, NEW.agent_id
  FROM conversations conv
  WHERE conv.client_id = NEW.client_id::text
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_co_agent_conversations
AFTER INSERT ON client_agents
FOR EACH ROW EXECUTE FUNCTION sync_co_agent_to_conversations();

-- Backfill pour l'existant
INSERT INTO conversation_agents (conversation_id, agent_id)
SELECT DISTINCT conv.id, ca.agent_id
FROM conversations conv
JOIN client_agents ca ON ca.client_id::text = conv.client_id
ON CONFLICT DO NOTHING;
```

### 4. Vérification post-migration

- Lancer le linter Supabase pour confirmer qu'aucune nouvelle alerte RLS n'apparaît.
- Tester rapidement (vérification logique) :
  - Co-agent peut INSERT dans `client_candidates` ✅
  - Co-agent peut INSERT dans `messages` pour la conversation du client partagé ✅
  - Co-agent peut INSERT dans `documents` (candidate_id) ✅

## Détails techniques

- Toutes les nouvelles policies suivent le pattern existant : `EXISTS … clients.agent_id` **OR** `EXISTS … client_agents`.
- Le trigger `sync_co_agent_to_conversations` est `SECURITY DEFINER` (cohérent avec le pattern projet) et ajoute uniquement dans `conversation_agents` (pas de notification à renvoyer).
- Aucun changement côté frontend nécessaire — la correction est 100% côté base de données.
- Aucune table ni colonne supprimée. Aucun risque de perte de données.

## Hors périmètre

- Pas de modification des droits côté `coursiers`, `clients`, `proprietaires`, `apporteurs` — uniquement la parité agent principal ↔ co-agents.
- Pas de refonte du modèle de permissions ; on étend les policies existantes.