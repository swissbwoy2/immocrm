

## Phase 4C — Connector Hardening for AI Relocation

### Summary

Harden `runAutonomousSearch` with per-source timeouts, throttling, URL validation, error classification, structured execution metadata, and expose source-level diagnostics in the admin UI.

---

### Files to modify

| File | Action |
|---|---|
| `supabase/functions/ai-relocation-api/index.ts` | Harden `scrapeUrl`, `extractListingsWithAI`, `runAutonomousSearch` |
| `src/components/admin/ai-relocation/MissionDetailDrawer.tsx` | Add per-source execution details in run cards |

No new files. No schema changes.

---

### A. Source-level execution safety (in `ai-relocation-api/index.ts`)

**A1. Per-source timeout** — Wrap `scrapeUrl` fetch with `AbortController` (30s timeout). Same for `extractListingsWithAI` (60s timeout for AI call). Both functions gain a `signal` parameter.

**A2. Inter-source throttling** — Add `await delay(1500)` between portals in the `for` loop (skip before first portal).

**A3. URL validation** — After `portal.buildUrl()`, validate URL with `new URL()` in try/catch. If malformed, record source as failed with `error_type: 'source_invalid'`, skip.

**A4. Safe source isolation** — Already has try/catch per portal. Will be enhanced to capture structured error info into per-source metadata.

---

### B. Error classification and retries

Add error classification helper:

```typescript
type ErrorType = 'timeout' | 'network' | 'source_invalid' | 'scraper_error' 
  | 'ai_extraction_error' | 'empty_result' | 'rate_limited' | 'unknown';

function classifyError(err: unknown, context: string): { type: ErrorType; message: string; retryable: boolean }
```

Classification logic:
- `AbortError` / timeout signal → `timeout`, retryable
- `TypeError` (fetch network) → `network`, retryable  
- Firecrawl 429 → `rate_limited`, retryable
- Firecrawl 4xx → `scraper_error`, not retryable
- Firecrawl 5xx → `scraper_error`, retryable
- AI extraction returns empty → `empty_result`, not retryable
- AI extraction HTTP error → `ai_extraction_error`, not retryable
- Malformed URL → `source_invalid`, not retryable
- Everything else → `unknown`, not retryable

**Retry**: One retry for retryable errors, with 2s delay before retry. Retry attempt logged in metadata (`retried: true`).

---

### C. Execution metadata structure

Refactor `runAutonomousSearch` to build per-source metadata array:

```typescript
interface SourceExecMeta {
  name: string;
  url: string;
  status: 'success' | 'failed' | 'empty';
  error_type?: ErrorType;
  error_message?: string;
  listings_count: number;
  duration_ms: number;
  retried: boolean;
}
```

At end of `runAutonomousSearch`, build the full metadata object with `sources[]` and `totals{}`, store in `mission_execution_runs.execution_metadata`.

The existing `sources_searched`, `results_found`, `results_new`, `duplicates_detected` fields continue to be updated for backward compatibility.

---

### D. Ingestion robustness

Enhance `scrapeUrl` to return structured result instead of `string | null`:

```typescript
interface ScrapeResult {
  markdown: string | null;
  status: number;
  error_type?: ErrorType;
  error_message?: string;
}
```

This lets the caller distinguish between "no content" vs "rate limited" vs "scraper error" for proper classification.

Similarly, `extractListingsWithAI` returns `{ listings: ResultRow[]; error_type?: ErrorType; error_message?: string }` so extraction failures are classified.

---

### E. Frontend source-level monitoring (`MissionDetailDrawer.tsx`)

In each run card, if `run.execution_metadata?.sources` exists, render a collapsible source-by-source breakdown:

- Source name + status badge (green/red/yellow)
- Listings count + duration
- Error type + message if failed
- "Retried" indicator if applicable
- Totals summary row

Also show the `totals` block: sources attempted/succeeded/failed, raw listings, inserted, duplicates.

This replaces the current simple "Résultats: X trouvés, Y nouveaux, Z doublons" with richer data when metadata is available (falls back to current display for old runs).

---

### Implementation order

1. Add error classification helper + types to `ai-relocation-api/index.ts`
2. Refactor `scrapeUrl` to return `ScrapeResult` with timeout via AbortController
3. Refactor `extractListingsWithAI` to return structured result with timeout
4. Refactor `runAutonomousSearch`: add throttling, URL validation, per-source metadata collection, retry logic, store `execution_metadata`
5. Update `MissionDetailDrawer.tsx` with source-level diagnostics UI

