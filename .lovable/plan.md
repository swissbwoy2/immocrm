

# Plan — Module Agent IA OpenClaw pour Logisorama

## Vue d'ensemble

Construire un module complet pour intégrer OpenClaw comme agent IA externe avec : nouvelles tables DB, edge function API sécurisée, interface admin de gestion/validation, et logique zero-trust avec validation humaine obligatoire.

## Phase 1 — Base de données (Migration SQL)

### 1.1 Nouveau rôle `app_role`
Ajouter `'agent_ia'` à l'enum `app_role` existant.

### 1.2 Nouvelles tables

**`ai_agents`** — Fiche agent IA (OpenClaw et futurs bots)
- `id`, `user_id` (ref profiles), `type` (ai_agent), `name`, `display_name`, `status` (active/inactive/suspended), `assigned_manager` (ref profiles), `email_channel`, `allowed_actions` (jsonb), `requires_validation` (bool, default true), `security_level`, `api_token_hash`, `webhook_url`, `audit_log_enabled` (default true), `last_activity_at`, `created_at`, `updated_at`

**`ai_agent_assignments`** — Liaison agent IA ↔ clients
- `id`, `ai_agent_id` (ref ai_agents), `client_id` (ref clients), `assigned_by` (ref profiles), `assigned_at`, `status` (active/paused/completed), `priority`, `notes`, `created_at`

**`ai_agent_actions`** — Journal complet de toutes les actions
- `id`, `ai_agent_id`, `client_id`, `property_id`, `action_type` (enum: search, prepare_draft, prepare_candidature, send_email, submit_candidature, contact_agency, update_status, log_call, etc.), `action_payload` (jsonb), `draft_content` (text), `status` (pending/approved/rejected/executed/failed), `requires_approval` (bool), `approved_by` (ref profiles), `approved_at`, `rejected_reason`, `executed_at`, `execution_result` (jsonb), `error_message`, `channel` (email/flatfox/phone/other), `source_type` (api/webhook/internal), `created_at`

**`ai_agent_property_matches`** — Annonces trouvées par OpenClaw
- `id`, `ai_agent_id`, `client_id`, `source_url`, `source_platform`, `title`, `address`, `location`, `price`, `rooms`, `surface`, `property_type`, `description`, `images` (jsonb), `match_score`, `match_details` (jsonb), `status` (found/proposed/sent/rejected/duplicate), `created_at`

**`ai_agent_drafts`** — Brouillons e-mails/candidatures
- `id`, `ai_agent_id`, `client_id`, `property_match_id`, `draft_type` (email/candidature/message), `channel` (outlook/infomaniak/flatfox/other), `recipient_email`, `recipient_name`, `subject`, `body`, `attachments` (jsonb), `status` (draft/ready/pending_approval/approved/sent/rejected), `approved_by`, `approved_at`, `sent_at`, `created_at`, `updated_at`

**`ai_agent_call_logs`** — Suivi appels régies
- `id`, `ai_agent_id`, `client_id`, `agency_name`, `contact_name`, `phone_number`, `call_script`, `call_notes`, `call_result`, `next_callback_at`, `status`, `created_at`

### 1.3 RLS Policies
- Admins : accès complet à toutes les tables AI
- Agent IA (role `agent_ia`) : lecture seule sur ses propres assignments et clients assignés, écriture sur actions/matches/drafts/call_logs uniquement pour ses clients, aucune exécution d'action sensible directe
- Agents humains : lecture sur les données AI de leurs clients partagés

### 1.4 Trigger de journalisation
Trigger `AFTER INSERT OR UPDATE` sur `ai_agent_actions` pour mettre à jour `ai_agents.last_activity_at`.

## Phase 2 — Edge Function API (`openclaw-api`)

Edge function unique avec authentification JWT et vérification du rôle `agent_ia`.

### Endpoints (actions dans le body) :

**Lecture (sans validation requise) :**
- `get_assigned_clients` — clients assignés + critères
- `get_client_criteria` — critères détaillés d'un client
- `get_client_documents` — liste des documents du dossier
- `get_property_matches` — annonces déjà enregistrées
- `get_pending_approvals` — actions en attente de validation
- `get_drafts` — brouillons existants

**Écriture contrôlée (crée des enregistrements, pas d'exécution) :**
- `create_property_match` — enregistrer une annonce trouvée
- `create_draft` — créer un brouillon email/candidature
- `request_approval` — demander validation pour une action sensible
- `log_action` — enregistrer une action effectuée
- `log_call` — enregistrer un contact régie
- `update_pipeline_status` — mettre à jour le statut du pipeline client

**Exécution (après validation admin uniquement) :**
- `execute_approved_action` — exécuter une action approuvée (vérifie `approved_by IS NOT NULL`)

### Sécurité :
- Vérification JWT via `getClaims()`
- Vérification du rôle `agent_ia` via `has_role()`
- Vérification que le client est bien assigné à cet agent IA
- Rate limiting basique (compteur d'actions par heure)
- Validation des payloads avec schémas stricts
- Aucune action sensible sans `approved_by` renseigné
- Journalisation de chaque appel API

## Phase 3 — Interface Admin

### 3.1 Page `/admin/openclaw` — Module Agent IA OpenClaw

**Section A : Vue générale**
- Statut agent, clients assignés, recherches en cours, candidatures prêtes, brouillons en attente, actions bloquées, dernières actions

**Section B : Clients assignés**
- Liste avec nom, critères, statut pipeline, urgence, annonces trouvées, candidatures prêtes, dernière activité, bouton "ouvrir dossier"

**Section C : Centre de validation**
- Liste des actions `status = 'pending'` et `requires_approval = true`
- Pour chaque action : type, client, contenu, canal
- Boutons : Approuver / Refuser / Modifier avant approbation
- Approuver = met `approved_by`, `approved_at`, et déclenche l'exécution si applicable

**Section D : Journal complet**
- Table filtrable de `ai_agent_actions` : date, client, type, canal, contenu, statut, validation, résultat

### 3.2 Widget sur fiche client (`/admin/clients/:id`)
- Bouton "Assigner à OpenClaw"
- Section affichant les annonces trouvées, brouillons, statut pipeline IA

### 3.3 Navigation
- Ajouter entrée "Agent IA" dans le menu admin

## Phase 4 — Webhook endpoint

Edge function `openclaw-webhook` pour recevoir des notifications d'OpenClaw (résultats de recherche, statuts) avec :
- Validation par token secret (`OPENCLAW_WEBHOOK_SECRET`)
- Journalisation de chaque appel
- Insertion dans les tables appropriées

## Ordre d'implémentation

1. Migration SQL (toutes les tables + enum + RLS)
2. Edge function `openclaw-api` (lecture + écriture contrôlée)
3. Edge function `openclaw-webhook`
4. Page admin `/admin/openclaw` (vue générale + validation + journal)
5. Widget fiche client (assignation + vue IA)
6. Navigation admin

## Détails techniques

- Les actions sensibles sont définies par une liste dans l'edge function : `send_email`, `submit_candidature`, `contact_agency`, `update_critical_status`, `delete_data`, `trigger_external`
- Les actions non-sensibles : `search`, `prepare_draft`, `prepare_candidature`, `log_call`, `create_match`, `update_pipeline`
- Le champ `submission_channel` supporte : `email`, `flatfox`, `agency_site`, `other`
- Le champ `email_channel` supporte : `outlook`, `infomaniak`, `other`
- Token API : généré côté admin, hashé en base, transmis dans le header `X-OpenClaw-Token`
- Pas d'accès direct à la DB pour OpenClaw — uniquement via l'edge function

