

## Step 1 — SQL Migration: Logisorama AI Relocation Module

### Summary

Single SQL migration creating 10 enums, 9 tables, ALTER on `ai_agent_assignments`, indexes, RLS policies, 3 DB functions, and triggers. No frontend or edge function changes.

### Migration details

**10 enums** as specified (mission_status, mission_frequency, execution_run_status, property_result_status, score_label, offer_status, visit_request_status, approval_status, approval_type, connector_type).

**9 tables** — all with `ENABLE ROW LEVEL SECURITY`, `created_at timestamptz default now()`, and `updated_at` where mutable:

1. `source_connectors` (standalone, no FK deps)
2. `search_missions` (FK clients, ai_agents, ai_agent_assignments)
3. `mission_execution_runs` (FK search_missions)
4. `property_results` (FK search_missions, clients, ai_agents; self-ref duplicate_of_id; monetary as numeric; images as jsonb)
5. `property_result_scores` (FK property_results, unique on property_result_id)
6. `client_offer_messages` (FK clients, ai_agents; property_result_ids uuid[])
7. `visit_requests` (FK property_results, clients, ai_agents, search_missions)
8. `approval_requests` (generic reference_id + reference_table)
9. `ai_agent_activity_logs` (full audit, nullable FKs)

**ALTER `ai_agent_assignments`** — add 7 columns: `urgency_level text`, `allowed_sources text[]`, `allowed_actions jsonb`, `approval_required_for_offers bool default true`, `approval_required_for_visits bool default true`, `auto_send_enabled bool default false`, `auto_visit_booking_enabled bool default false`.

**Indexes on `property_results`**: client_id, mission_id, ai_agent_id, external_listing_id, source_name, result_status, plus unique constraint on (source_name, external_listing_id, client_id) for dedup.

**RLS** — per table:
- Admin: full CRUD via `has_role(auth.uid(), 'admin')`
- Agent IA: SELECT (+ INSERT on property_results, activity_logs, execution_runs) scoped via `EXISTS (SELECT 1 FROM ai_agents WHERE id = <table>.ai_agent_id AND user_id = auth.uid())`
- source_connectors: admin CRUD only, authenticated SELECT for all (reference data)

**3 DB functions** (SECURITY DEFINER, plpgsql):
1. `calculate_match_score(p_property_result_id uuid, p_criteria jsonb)` — reads property, scores per criteria dimension, upserts score row, updates property_results
2. `log_ai_activity(...)` — simple INSERT wrapper
3. `create_approval_request(...)` — INSERT + returns uuid

**Triggers**:
- `update_updated_at` reusing existing `update_updated_at_column()` on search_missions, visit_requests, property_results, client_offer_messages, approval_requests
- `trg_ai_activity_log_activity` on ai_agent_activity_logs INSERT calling existing `update_ai_agent_last_activity()`

### No changes
- No edge functions
- No frontend
- Legacy tables untouched

