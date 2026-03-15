

## Phase 5A — Hybrid Browser Agent Integration

### Summary

Add `POST /missions/:id/browser-run` to the existing `ai-relocation-api` Edge Function, a Globe trigger button in admin, and browser diagnostics in the drawer. Includes all approved safeguards: multi-layer validation, partial success, empty valid runs, Lausanne geographic grouping, flexible criteria interpretation, mandatory direct URLs, and domain consistency checks.

### Prerequisites — 2 New Secrets

- `AI_BROWSER_AGENT_URL` — base URL of external browser worker
- `AI_BROWSER_AGENT_SECRET` — shared auth secret

Neither exists yet. Will request via `add_secret` before implementation.

---

### File Changes

#### 1. `supabase/functions/ai-relocation-api/index.ts`

**Add after line 539** (after existing constants):

Browser constants:
- `BROWSER_AGENT_TIMEOUT_MS = 150_000`
- `BROWSER_MAX_PAGES = 3`, `BROWSER_MAX_CARDS = 50`, `BROWSER_MAX_DETAIL_PAGES = 15`, `BROWSER_MAX_DURATION_MS = 120_000`

Browser adapter registry (`BROWSER_ADAPTER_REGISTRY` Map) for 6 portals: `immobilier.ch`, `flatfox.ch`, `immoscout24.ch`, `homegate.ch`, `acheter-louer.ch`, `dreamo.ch` — each with domain, status, priority.

`BROWSER_ADAPTER_NAMES` set (excluding disabled).

`isDomainConsistent(sourceUrl, sourceName)` helper — extracts hostname, checks it contains the adapter's registered domain.

`LAUSANNE_LIMITROPHES` array (Renens, Chavannes, Ecublens, Crissier, Prilly, Pully, Belmont, La Conversion, Saint-Sulpice, Le Mont, Epalinges, Cheseaux).

Add `dreamo` to `SOURCE_ALIASES` (line ~474).

**Add route after line 293** (after existing `/missions/:id/run`):

```typescript
const browserRunMatch = path.match(/^\/missions\/([^/]+)\/browser-run$/);
if (req.method === 'POST' && browserRunMatch) {
  return await handleMissionsBrowserRun(adminClient, aiAgent, browserRunMatch[1], req);
}
```

**New `handleMissionsBrowserRun` handler** — follows the exact same pattern as `handleMissionsRun` (line 924) but proxies to external worker instead of calling `runAutonomousSearch`:

1. Validate mission is active + belongs to agent
2. Check `AI_BROWSER_AGENT_URL` + `AI_BROWSER_AGENT_SECRET` → 503 if missing
3. Filter `mission.allowed_sources` to `BROWSER_ADAPTER_NAMES` → 400 if empty
4. Create `mission_execution_runs` with `status: 'running'`
5. Update `mission.last_run_at`, log `mission_browser_run_started`
6. Fetch worker at `POST {URL}/browser-agent/run` with `AbortController` timeout + `X-Browser-Agent-Secret` header
7. Error handling:
   - `AbortError` → `browser_worker_timeout`, run = failed
   - `!response.ok` → safe body read, `browser_worker_error_{status}`, run = failed
   - JSON parse failure → `browser_worker_invalid_response`, run = failed
8. Source validation: reject sources not in both `allowed_sources` AND `BROWSER_ADAPTER_NAMES`
9. Listing validation: reject if `source_name` not allowed, `title` empty, `source_url` missing/invalid, or domain inconsistent with `source_name`. Normalize `external_listing_id`.
10. Outcome logic:
    - Zero listings + no hard failure = valid empty run (`completed`)
    - Some rejected + valid subset = continue with valid, record rejections
    - Only hard worker errors = `failed`
11. Ingest valid listings via existing `ingestResults()`
12. Store `execution_metadata` with: `execution_mode: "browser"`, `sources_attempted/validated/rejected_sources`, `browser_listings_returned/validated`, `rejected_listings`, `inserted_results`, `duplicates`, per-source browser fields, `interpreted_criteria`, `geo_groups`
13. Update run + mission counters, log completion

Worker payload: `{ mission_id, client_id, run_id, criteria, allowed_sources, caps, geo_hints }`.

Worker must prioritize direct canonical listing URLs and never intentionally return search-result URLs when listing-detail URLs are available. Geographic scope hints (Lausanne extended basin) are guidance for the worker, but final results must still be validated and returned with explicit grouping metadata.

---

#### 2. `src/components/admin/ai-relocation/MissionsTab.tsx`

- Import `Globe` from lucide-react
- Add `browserRunMutation` calling `POST /missions/:id/browser-run` (same pattern as existing `runMutation` at line ~64)
- Add Globe button next to Zap for active missions
- Both buttons disabled while either mutation is pending

---

#### 3. `src/components/admin/ai-relocation/MissionDetailDrawer.tsx`

Extend `SourceMeta` with optional browser fields: `adapter`, `filters_requested`, `filters_applied`, `cards_seen`, `detail_pages_opened`, `canonical_urls_extracted`, `pagination_depth`.

Extend `ExecMetadata` with: `execution_mode`, `browser_listings_returned`, `browser_listings_validated`, `rejected_listings`, `rejected_sources`, `sources_attempted`, `sources_validated`, `interpreted_criteria`, `geo_groups`.

UI per run card:
- Execution mode badge ("Standard" / "Navigateur")
- For browser runs: pipeline "Retournés → Validés → Insérés"
- Rejected counts in amber if > 0
- Browser source details in collapsible
- Graceful fallback for standard/old runs

---

### Implementation Order

1. Request 2 secrets (`AI_BROWSER_AGENT_URL`, `AI_BROWSER_AGENT_SECRET`)
2. Add constants + registry + helpers + `dreamo` alias + route + handler to `index.ts`
3. Update `MissionsTab.tsx` with Globe button
4. Update `MissionDetailDrawer.tsx` with browser diagnostics

