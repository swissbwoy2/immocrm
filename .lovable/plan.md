

## Phase 4B — Scheduled Mission Automation

### Summary

Create a scheduler edge function that periodically triggers eligible missions, with internal auth via `x-scheduler-secret` only (no service role bearer). Each function uses its own local service role client. Failed runs are classified as transient vs permanent before retrying.

---

### Files to create/modify

| File | Action |
|---|---|
| `supabase/functions/ai-relocation-scheduler/index.ts` | **Create** |
| `supabase/functions/ai-relocation-api/index.ts` | Add scheduler auth bypass for `/missions/:id/run` only |
| `supabase/config.toml` | Add `[functions.ai-relocation-scheduler]` |
| `src/components/admin/ai-relocation/MissionsTab.tsx` | Add `next_run_at` column |
| `src/components/admin/ai-relocation/AgentIADashboard.tsx` | Add scheduled missions KPI |

---

### A. Scheduler edge function (`ai-relocation-scheduler/index.ts`)

- `verify_jwt = false` in config.toml
- Auth: check `x-webhook-secret` header against `Deno.env.get('AI_RELOCATION_WEBHOOK_SECRET')`
- Creates its own local service role client: `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`
- Query eligible missions: `status = 'active'`, `frequency IN ('quotidien', 'hebdomadaire')`, `next_run_at IS NOT NULL`, `next_run_at <= now()`
- For each mission:
  1. Call `POST ${SUPABASE_URL}/functions/v1/ai-relocation-api/missions/${id}/run` with only `x-scheduler-secret` header + `Content-Type` + `apikey` (no `Authorization: Bearer` service role)
  2. On success: compute `next_run_at` (+1 day for quotidien, +7 days for hebdomadaire), update mission
  3. On failure: classify error:
     - **Transient** (network timeout, 5xx, scraping failures): set `next_run_at = now() + 1 hour`, keep mission active
     - **Permanent** (4xx like 404 mission not found, 403 forbidden, 400 bad config): do NOT update `next_run_at`, log clearly so admin sees the stuck mission. Mission stays active but won't loop because `next_run_at` remains in the past — visible as "overdue" in UI
  4. Log activity for each trigger
- Return summary: `{ missions_checked, triggered, succeeded, failed, errors[] }`
- One mission failure does not stop the batch

### B. Internal scheduler auth in `ai-relocation-api/index.ts`

Insert before line 135 (before the existing JWT auth block):

```text
Check x-scheduler-secret header:
  if present and matches AI_RELOCATION_WEBHOOK_SECRET:
    - create local adminClient with service role key
    - parse path, only allow /missions/:id/run (reject all others with 403)
    - look up mission by ID to get ai_agent_id
    - fetch ai_agent record
    - call handleMissionsRun(adminClient, aiAgent, missionId, req)
    - return result
  if present but wrong value:
    - return 401
```

This keeps the existing user auth path completely untouched. The scheduler sends no `Authorization` bearer token — only `x-scheduler-secret`.

### C. `next_run_at` on mission creation

In `handleMissionsCreate` (after line 304, after insert succeeds):

- If `mappedFrequency === 'quotidien'`: update `next_run_at = now() + 1 day`
- If `mappedFrequency === 'hebdomadaire'`: update `next_run_at = now() + 7 days`
- If `manuel`: leave null (default)

### D. Cron SQL snippet

Since `current_setting('app.settings.ai_relocation_webhook_secret')` is not confirmed to exist in this project, provide a manual placeholder with explicit replacement instructions:

```sql
SELECT cron.schedule(
  'ai-relocation-scheduler',
  '0 */1 * * *',
  $$
  SELECT net.http_post(
    url:='https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/ai-relocation-scheduler',
    headers:='{"Content-Type": "application/json", "x-webhook-secret": "REPLACE_WITH_ACTUAL_SECRET_VALUE"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

This will be inserted via SQL insert tool (not migration) with a note that the user must replace `REPLACE_WITH_ACTUAL_SECRET_VALUE` with the actual value of `AI_RELOCATION_WEBHOOK_SECRET`.

### E. Frontend: MissionsTab.tsx

- Add `Prochaine exécution` column header after `Dernière exécution`
- Display `m.next_run_at` formatted with `dd/MM HH:mm` or '—' if null

### F. Frontend: AgentIADashboard.tsx

- Add to `counts` query: count missions where `status = 'active'` AND `next_run_at IS NOT NULL` (scheduled missions)
- Add KPI card: "Missions planifiées" with `Clock` icon, variant `default`

### Transient vs permanent failure classification

```text
Transient (retry in 1h):
  - HTTP 5xx from ai-relocation-api
  - Network/fetch errors
  - Response indicates scraping failure (sourcesUsed.length === 0)

Permanent (no next_run_at update, stays visible as overdue):
  - HTTP 400 (bad config, mission not active)
  - HTTP 403 (forbidden)
  - HTTP 404 (mission not found)
  - HTTP 401 (auth failure)
```

### No schema changes required

`next_run_at` column already exists on `search_missions`.

