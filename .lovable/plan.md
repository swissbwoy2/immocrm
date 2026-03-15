

## Corrections for MissionsTab.tsx and SearchResultsTab.tsx

### 1. MissionsTab.tsx — 2 fixes

**Fix 1: Edge function invocation pattern is wrong.**
The `ai-relocation-api` uses path-based routing (e.g. `POST /missions/:id/run`), not `body.action`. The current code:
```ts
supabase.functions.invoke('ai-relocation-api', {
  body: { action: 'run_mission', mission_id: missionId },
})
```
Must be changed to construct the full URL and use `fetch()` directly:
```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;
await fetch(`${supabaseUrl}/functions/v1/ai-relocation-api/missions/${missionId}/run`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  body: JSON.stringify({}),
});
```

**Fix 2: Wrong field name `sources` → `allowed_sources`.**
Confirmed from schema: `search_missions` has `allowed_sources: string[] | null`. Line displaying `m.sources?.join(', ')` must become `m.allowed_sources?.join(', ')`.

### 2. SearchResultsTab.tsx — 4 fixes

**Fix 1: Wrong column names.** Confirmed from `property_results` schema:
- `rent` → `rent_amount`
- `rooms` → `number_of_rooms`
- `total_score` → `match_score`

**Fix 2: `score_label` does not exist on `property_results`.** It lives only on `property_result_scores` (oneToOne relation via `property_result_id`). Two options:
- **Option A**: Add a nested select to load it: `property_result_scores:property_result_scores(score_label, overall_score)`
- **Option B**: Remove the score_label badge from the table listing, only show `match_score`.

Recommended: **Option A** — add the join in the select, then reference `r.property_result_scores?.score_label`. This gives us both `overall_score` and `score_label` from the proper source. Replace `match_score` display with `overall_score` from the scores table for consistency, and keep `match_score` as a fallback.

**Fix 3: Display corrections in table cells:**
```
{r.rent_amount ? `${r.rent_amount} CHF` : '—'}
{r.number_of_rooms ?? '—'}
```
For score: use `r.property_result_scores?.overall_score ?? r.match_score` and `r.property_result_scores?.score_label`.

**Fix 4: `.or()` search pattern** — add basic sanitization by escaping `%` and `_` in the search term to prevent PostgREST injection. Not critical but good practice.

### Files changed

| File | Changes |
|------|---------|
| `MissionsTab.tsx` | Fix edge function call to use path-based `fetch()`. Fix `sources` → `allowed_sources`. |
| `SearchResultsTab.tsx` | Fix column names. Add `property_result_scores` join. Fix score display. Sanitize search input. |

No other files affected.

