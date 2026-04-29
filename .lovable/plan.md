## Diagnostic

L'erreur de permission d'Victoria vient du flux de la page **`src/pages/agent/EnvoyerOffre.tsx`**, pas de la table `offres` elle-même.

**Preuves recueillies :**
- Victoria a 10 liens valides dans `client_agents` (donc la RLS de `offres` passe).
- Aujourd'hui, **3 offres ont bien été insérées** par Victoria pour le client `f248d88b…` (RLS OK).
- Mais Victoria a **0 conversation** avec son `agent_id`, et **0 message** lié à ces 3 offres.
- Donc : l'`INSERT offres` réussit → l'étape suivante (création/lookup de conversation) échoue → l'erreur est attrapée et affichée à l'utilisateur, laissant 3 offres orphelines en base.

**Cause racine du blocage côté UI :**
Ligne 224-229 de `EnvoyerOffre.tsx` :
```ts
.from('conversations').select('*')
  .eq('client_id', clientId)
  .eq('agent_id', agent.id)   // = victoria.id
  .single();                  // PGRST116 si aucune ligne
```
Victoria étant co-agent, la conversation existante appartient à l'**agent principal** (un autre `agent_id`). Le `.single()` renvoie une erreur PGRST116, le code passe ensuite en INSERT d'une nouvelle conversation. Cet INSERT déclenche une erreur (RLS et/ou PGRST116 mal géré), qui remonte → toast "Impossible d'envoyer l'offre" → **les offres déjà créées restent orphelines**.

**Cause racine sous-jacente (RLS) :**
La policy INSERT de `offres` (`Agents multi peuvent créer offres`) ne contrôle QUE `client_agents`. Si un agent principal (via `clients.agent_id`) n'a pas de ligne miroir dans `client_agents`, son INSERT échouerait — fragile et incohérent avec le reste du système (cf. mémoire `dual-source-assignment-integrity-strategy`).

---

## Plan de correction

### 1. Corriger le flux conversation dans `EnvoyerOffre.tsx` (agent + admin)

Faire en sorte qu'un co-agent **rejoigne** la conversation existante du client (peu importe quel agent l'a créée) au lieu d'en créer une nouvelle isolée.

**Logique cible :**
1. Chercher TOUTE conversation `client-agent` pour ce `client_id` (sans filtrer par `agent_id`), via `.maybeSingle()` ou `.limit(1)`.
2. Si trouvée → s'assurer que Victoria figure dans `conversation_agents` (déjà géré par notre trigger récent, mais re-vérifier en INSERT idempotent).
3. Si aucune n'existe → créer une nouvelle conversation avec `agent_id = victoria.id`.
4. Insérer le message dans cette conversation.

Appliquer la même correction à :
- `src/pages/agent/EnvoyerOffre.tsx`
- `src/pages/admin/EnvoyerOffre.tsx`
- `src/components/ResendOfferDialog.tsx` (même schéma bogué visible lignes 99-127)

### 2. Renforcer les RLS pour la parité totale principal/co-agent

Migration SQL pour aligner toutes les policies sur le pattern documenté `mem://features/co-assignment-rls-logic` (OR principal OR co-agent) :

- **`offres` INSERT/UPDATE/SELECT/DELETE** — ajouter la branche `EXISTS clients c JOIN agents a ON a.id = c.agent_id WHERE c.id = offres.client_id AND a.user_id = auth.uid()` en OR de la branche `client_agents`.
- **`conversations` INSERT** — étendre `can_agent_create_conversation` pour accepter aussi le cas `clients.agent_id = _agent_id` (parité défensive).
- **`visites` INSERT/UPDATE** — vérifier et ajouter la branche co-agent si manquante (utilisée juste après l'INSERT offres).

### 3. Backfill / nettoyage

- Supprimer les 3 offres orphelines de Victoria créées aujourd'hui sans message associé (ou les conserver et générer un message rétroactif — à confirmer avec vous).
- Aucune autre migration de données nécessaire (les liens `client_agents` sont OK).

### 4. Mettre à jour la mémoire

Étendre `mem://features/co-assignment-rls-logic` pour inclure :
- L'obligation de **ne pas filtrer une conversation existante par `agent_id`** côté UI quand un co-agent envoie une offre/message.
- Le pattern `OR clients.agent_id` à inclure systématiquement dans les RLS sur tables liées à `client_id`.

---

## Fichiers impactés

```text
Code:
  src/pages/agent/EnvoyerOffre.tsx        (lignes 224-271 réécrites)
  src/pages/admin/EnvoyerOffre.tsx        (même bloc à réécrire)
  src/components/ResendOfferDialog.tsx    (lignes 99-127 réécrites)

SQL (migration):
  - Réécriture policies INSERT/UPDATE/SELECT/DELETE sur public.offres
  - Réécriture fonction can_agent_create_conversation
  - Vérification + ajout policies co-agent sur public.visites
  - DELETE des 3 offres orphelines (optionnel, à confirmer)

Mémoire:
  mem://features/co-assignment-rls-logic  (extension du pattern)
```

## Question avant exécution

Que faire des **3 offres orphelines** de Victoria créées aujourd'hui (sans message envoyé au client) ?
A) Les supprimer (recommandé — le client n'a rien reçu)
B) Les conserver et créer un message rétroactif dans la conversation existante
C) Les laisser telles quelles
