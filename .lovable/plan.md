

## Step 2 — Edge Functions Implementation Plan

All schema confirmed from live database. Ready for implementation.

### Files

| File | Action |
|------|--------|
| `supabase/functions/_shared/result-ingestion.ts` | Create |
| `supabase/functions/ai-relocation-api/index.ts` | Create |
| `supabase/functions/ai-relocation-webhook/index.ts` | Create |
| `supabase/functions/openclaw-api/index.ts` | Delete |
| `supabase/functions/openclaw-webhook/index.ts` | Delete |
| `supabase/config.toml` (lines 147-151) | Replace openclaw entries with ai-relocation entries |

### File 1: `_shared/result-ingestion.ts` (~140 lines)

**`ingestResults(adminClient, { mission_id, client_id, ai_agent_id, results[], criteria })`**
Returns `{ inserted, duplicates, failed, ids, errors }`.

Per result:
1. If `external_listing_id` is truthy: SELECT check `(source_name, external_listing_id, client_id)` from `property_results` — if found, increment duplicates, skip
2. If null/empty: skip dedup, always insert
3. INSERT into `property_results` mapping to confirmed columns: `mission_id`, `client_id`, `ai_agent_id`, `source_name`, `source_url`, `external_listing_id`, `title`, `address`, `postal_code`, `city`, `canton`, `rent_amount`, `charges_amount`, `total_amount`, `number_of_rooms`, `living_area`, `availability_date`, `description`, `images`, `contact_name`, `contact_email`, `contact_phone`, `visit_booking_link`, `application_channel`, `extraction_timestamp`
4. If criteria provided: `adminClient.rpc('calculate_match_score', { p_property_result_id, p_criteria: criteria })`
5. Each row in try/catch

**`buildCriteriaSnapshot(adminClient, clientId)`**
- Query `clients` by id: `budget_max`, `pieces`, `region_recherche`, `type_bien`, `souhaits_particuliers`, `nombre_occupants`, `demande_mandat_id`
- If `demande_mandat_id` non-null: query `demandes_mandat` by id: `budget_max`, `pieces_recherche`, `region_recherche`, `type_bien`, `type_recherche`, `nombre_occupants`, `souhaits_particuliers`
- Precedence: clients wins. demandes_mandat fills nulls only.
- Output: `{ budget_max, city (from region_recherche), rooms (from pieces or parsed pieces_recherche), surface_min: null, type_bien, canton: null, type_recherche, nombre_occupants, souhaits_particuliers }`

### File 2: `ai-relocation-api/index.ts` (~500 lines)

**Auth**: Bearer JWT → `getClaims(token)` → check `agent_ia` or `admin` role from `user_roles` → load active `ai_agents` record → service role client for writes.

**7 path-based endpoints** (URL pathname routing):

1. **POST `/missions/create`**: validate client_id, call `buildCriteriaSnapshot`, INSERT `search_missions` with criteria_snapshot/frequency/allowed_sources/status `active`, log via `log_ai_activity` RPC
2. **POST `/missions/:id/run`**: validate mission active, INSERT `mission_execution_runs` (status `running`), UPDATE `search_missions.last_run_at`, log
3. **POST `/results/batch`**: call shared `ingestResults()`, UPDATE `mission_execution_runs` counters (results_found, results_new, duplicates_detected), UPDATE `search_missions` counters (results_found, results_retained), log
4. **POST `/offers/prepare`**: validate property_result_ids, INSERT `client_offer_messages` with status `brouillon`, check `ai_agent_assignments.approval_required_for_offers` → if true set status `en_attente_validation` + call `create_approval_request` RPC (type `offer`), log. **No property_results update.**
5. **POST `/visits/request`**: validate, INSERT `visit_requests` (status `non_traite`, approval_required from assignment), check `approval_required_for_visits` → call `create_approval_request` (type `visit`) if needed, log
6. **GET `/clients/:id/criteria`**: call `buildCriteriaSnapshot`, return JSON
7. **POST `/log`**: call `log_ai_activity` RPC with provided params

### File 3: `ai-relocation-webhook/index.ts` (~200 lines)

**Auth**: `X-AI-Relocation-Webhook-Secret` header vs `AI_RELOCATION_WEBHOOK_SECRET` env var.

**Event routing** on `event_type`:
- `mission.started`: find existing run by `(mission_id, status=running)` → UPDATE if found, otherwise INSERT new `mission_execution_runs` row. Log.
- `mission.completed`: update run to `completed` + `completed_at`, update `search_missions` counters, log
- `mission.failed`: update run to `failed` + `error_message`, log
- `results.found`: call shared `ingestResults()`, log
- `offer.prepared` / `visit.prepared`: log activity
- `connector.error`: log error

### Config changes (lines 147-151)

Replace:
```toml
[functions.ai-relocation-api]
verify_jwt = false

[functions.ai-relocation-webhook]
verify_jwt = false
```

### Post-implementation note

`AI_RELOCATION_WEBHOOK_SECRET` must be added as a secret before the webhook function can authenticate incoming requests.

