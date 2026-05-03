## Problème

Un agent **co-assigné** (lié à un client uniquement via `client_agents`, sans être l'agent principal `clients.agent_id`) ne peut pas :

1. **Uploader / supprimer des documents** dans le dossier du client.
2. **Voir / utiliser la conversation existante** avec ce client (donc impossible de déposer un dossier de candidature, qui se fait depuis la messagerie).
3. **Voir une conversation déjà créée** par l'agent principal.

## Causes racines

### 1. Storage RLS — bucket `client-documents`

Les policies INSERT/DELETE existantes sur les fichiers du dossier `user_id/...` ne testent QUE `clients.agent_id = a.user_id` (agent principal). Les co-agents sont bloqués au upload :

```
"Agents peuvent uploader documents pour leurs clients" (INSERT)
"Agents peuvent supprimer documents de leurs clients" (DELETE)
```
→ Pas de branche `client_agents`.

Seule une policy SELECT pour co-agent existe (« Agents co-assignés peuvent voir documents… »).

### 2. Messagerie agent — filtre `agent_id` figé

`src/pages/agent/Messagerie.tsx` (lignes ~322-342) charge les conversations avec `.eq('agent_id', agentIdStr)`. Or pour les clients co-assignés, `conversations.agent_id` contient l'agent principal, pas le co-agent. Le co-agent ne voit donc rien (et ne peut pas ouvrir la conversation pour déposer le dossier).

La règle mémoire `co-assignment-rls-logic` impose justement : **ne jamais filtrer par `agent_id` côté UI ; passer par `conversation_agents`**.

### 3. NewConversationDialog — co-agent privé d'accès

`src/components/NewConversationDialog.tsx` filtre la liste à « clients sans conversation ». Pour un co-agent dont le client a déjà une conversation principale, il n'a aucun moyen d'y entrer (et ne peut pas en recréer une à cause de la contrainte d'unicité / `can_agent_create_conversation`).

## Plan d'implémentation

### A. Migration SQL — Storage policies co-agent

Ajouter deux policies sur `storage.objects` pour le bucket `client-documents`, branche `client_agents` (en plus des policies existantes) :

```sql
-- INSERT
CREATE POLICY "Co-agents peuvent uploader documents clients"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1 FROM clients c
    JOIN client_agents ca ON ca.client_id = c.id
    JOIN agents a ON a.id = ca.agent_id
    WHERE c.user_id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

-- DELETE (équivalent)
CREATE POLICY "Co-agents peuvent supprimer documents clients" ...
```

(Conserve la regex UUID conformément à la règle `storage-rls-uuid-validation`.)

### B. `src/pages/agent/Messagerie.tsx` — charger via `conversation_agents`

Remplacer le bloc de chargement (lignes ~322-345) :

```ts
// 1. Récupérer les conversation_ids dont je suis agent (principal OU co)
const { data: convAgents } = await supabase
  .from('conversation_agents')
  .select('conversation_id')
  .eq('agent_id', agentIdStr);

const convIds = convAgents?.map(c => c.conversation_id) ?? [];

// 2. Charger ces conversations (client-agent restreint aux clients assignés)
const { data: clientConvs } = await supabase
  .from('conversations')
  .select('*')
  .in('id', convIds)
  .eq('conversation_type', 'client-agent')
  .in('client_id', assignedClientIds);

const { data: adminConvs } = await supabase
  .from('conversations')
  .select('*')
  .in('id', convIds)
  .eq('conversation_type', 'admin-agent');
```

Vérifier que les autres lookups dans le fichier (envoi de message, recherche d'une conversation pour un client donné) **filtrent par `client_id` uniquement** (pas par `agent_id`) — conforme à la règle mémoire. Corriger les occurrences résiduelles.

### C. `src/components/NewConversationDialog.tsx`

- Conserver la création d'une nouvelle conversation pour les clients qui n'en ont pas.
- Pour les clients qui en ont déjà une, ajouter un bouton **« Ouvrir la conversation »** qui appelle `onConversationCreated(existingId)` au lieu de masquer le client. Ainsi, un co-agent qui n'a pas encore été synchronisé (ancien lien) peut accéder à la conversation existante. (Le trigger `sync_co_agent_to_conversations` insère normalement la ligne `conversation_agents` lors du lien — on garde un appel idempotent en sécurité.)

### D. Backfill — `conversation_agents`

Migration SQL one-shot : pour tous les co-agents existants, garantir une ligne dans `conversation_agents` pour chaque conversation des clients liés.

```sql
INSERT INTO conversation_agents (conversation_id, agent_id)
SELECT conv.id, ca.agent_id
FROM conversations conv
JOIN client_agents ca ON ca.client_id = conv.client_id::uuid
ON CONFLICT DO NOTHING;
```

### E. `src/pages/agent/Candidatures.tsx`

Le chargement passe déjà par `client_agents` (OK). Vérifier que l'écran de **dépôt de dossier** (`SendDossierDialog`) est bien accessible depuis la messagerie pour un co-agent → résolu par les changements B/D (la conversation devient visible, le bouton « Déposer candidature » apparaît, l'INSERT dans `candidatures` est déjà autorisé par la policy `Agents multi peuvent gérer candidatures` qui couvre `client_agents`).

## Vérifications post-déploiement

- Connecter un agent co-assigné, ouvrir un client : upload d'un PDF dans son dossier → succès.
- Ouvrir la messagerie : la conversation du client co-assigné apparaît.
- Depuis cette conversation, déposer un dossier de candidature → INSERT OK, statut mis à jour.
- Suppression d'un document par le co-agent → autorisée.

## Hors scope

Pas de changement aux policies `documents` (table) ni `candidatures` ni `conversations` : elles incluent déjà `client_agents` dans leurs branches. Pas de modification du schéma.