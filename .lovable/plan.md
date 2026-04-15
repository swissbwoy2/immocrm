

# Lot 3 — Plan d'exécution final

## Vérifications de robustesse confirmées

### 1. `verify_jwt = true` et appels inter-Edge-Functions
Aucune des 5 Edge Functions n'appelle une autre Edge Function. Elles utilisent toutes `SUPABASE_SERVICE_ROLE_KEY` pour les requêtes DB internes. Aucun conflit avec `verify_jwt = true`.

### 2. `immeubles.agent_responsable_id` → `agents.user_id`
**Bug existant identifié** : `renovation-create-project` compare `immeuble.agent_responsable_id` directement à `user.id`, mais `agent_responsable_id` est une FK vers `agents.id` (pas `auth.users.id`). La résolution correcte nécessite un JOIN : `immeubles.agent_responsable_id → agents.id → agents.user_id`. Toutes les fonctions Lot 3 utiliseront cette résolution correcte.

---

## Étapes d'exécution

### Étape 1 — Migration SQL (~200 lignes)
- `ALTER TYPE renovation_project_status ADD VALUE 'closed'`
- `ALTER TYPE renovation_alert_type ADD VALUE` × 5 nouvelles valeurs
- ALTER tables : `renovation_incidents`, `renovation_reservations`, `renovation_warranties`, `renovation_ai_alerts`, `renovation_notifications_queue`, `renovation_projects` (colonnes détaillées dans le cadrage validé)
- Triggers audit : `trg_audit_incident_change`, `trg_audit_reservation_change`
- Fonction `renovation_check_project_closable(uuid)` RETURNS jsonb — SECURITY DEFINER
- Index idempotency sur `renovation_ai_alerts` et `renovation_notifications_queue`

### Étape 2 — config.toml
5 entrées ajoutées, toutes avec `verify_jwt = true`

### Étape 3 — 5 Edge Functions
1. **`renovation-get-history`** : whitelist actions, strip financier pour propriétaire, tri DESC LIMIT 100
2. **`renovation-generate-alerts`** : 7 types d'alertes, upsert idempotent, résolution auto
3. **`renovation-close-project`** : appel RPC `renovation_check_project_closable`, audit `project_closed`
4. **`renovation-generate-final-report`** : HTML structuré, upload storage, idempotent
5. **`renovation-dispatch-notifications`** : résolution destinataires via `agents.user_id` + `proprietaires.user_id`, idempotent

Toutes suivent le pattern auth existant : `anonClient.auth.getUser()` + check `user_roles`.

### Étape 4 — Types TypeScript
- `'closed'` ajouté à `RenovationProjectStatus`
- Interfaces : `RenovationIncident`, `RenovationReservation`, `RenovationWarranty`, `RenovationAlert`, `RenovationHistoryEntry`
- `RenovationProject` étendu avec `closed_at`, `closed_by`, `final_report_path`, `warranties_not_applicable`

### Étape 5 — Hooks (3 créés)
- `useRenovationIncidents.ts` — CRUD via SDK
- `useRenovationWarranties.ts` — CRUD via SDK
- `useRenovationHistory.ts` — appel Edge Function `renovation-get-history`

### Étape 6 — Composants (13 créés)
- `RenovationIncidentsList.tsx` + `RenovationIncidentForm.tsx`
- `RenovationReservationsList.tsx` + `RenovationReservationForm.tsx`
- `RenovationWarrantiesTable.tsx` + `RenovationWarrantyForm.tsx`
- `RenovationHistoryFeed.tsx`
- `RenovationAlertsPanel.tsx`
- `RenovationCloseProjectDialog.tsx` (avec toggle "garanties non applicables" + audit)
- `RenovationFinalReportCard.tsx`

### Étape 7 — Modifications existantes (2 fichiers)
- `RenovationProjectPage.tsx` : 4 nouveaux onglets + alertes header + bouton clôture + carte dossier final
- `RenovationStatusBadge.tsx` : ajout `closed` → "Clôturé"

### Étape 8 — Déploiement Edge Functions + tests
- Deploy des 5 fonctions
- Vérification logs de déploiement

