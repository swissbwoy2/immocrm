

## Phase 4C Final Adjustments

### 1. Replace hardcoded markdown truncation with named constant

**File**: `supabase/functions/ai-relocation-api/index.ts`

Add constant near line 498 (alongside other constants):
```typescript
const MAX_MARKDOWN_CHARS = 30_000;
```

Replace line 591's `markdown.substring(0, 30000)` with `markdown.substring(0, MAX_MARKDOWN_CHARS)`.

---

### 2. Add field normalization in `ingestResults()`

**File**: `supabase/functions/ai-relocation-api/index.ts`

Add a `normalizeResultRow(row: ResultRow): ResultRow` helper before `ingestResults`. Apply it to each row at the top of the loop (line 50).

Normalization rules:
- **title**: trim whitespace, collapse internal whitespace
- **address**: trim
- **city**: trim, capitalize first letter (e.g. "genève" → "Genève")
- **postal_code**: trim, keep only digits (Swiss format)
- **rent_amount / charges_amount / total_amount**: coerce to number via `parseFloat`, reject `NaN` → `null`; reject negative → `null`
- **number_of_rooms**: coerce to number, reject `NaN`/negative → `null`
- **living_area**: coerce to number, reject `NaN`/negative → `null`
- **contact_email**: trim, lowercase
- **contact_phone**: trim
- **contact_name**: trim
- **source_url / visit_booking_link**: trim; validate with `isValidUrl()`, set `null` if invalid
- **external_listing_id**: trim

---

### 3. Make `sources_searched` reflect all attempted sources

**File**: `supabase/functions/ai-relocation-api/index.ts`

Line 856: change `sources_searched: sourcesUsed` to `sources_searched: sourcesMeta.map(s => s.name)` so it reflects all attempted portals. Add a code comment:

```typescript
// sources_searched = all attempted portals. Source-level success/failure detail lives in execution_metadata.sources
```

The existing `sourcesUsed` array (only successful) continues to drive the run status check on line 851.

---

### Files modified

| File | Changes |
|---|---|
| `supabase/functions/ai-relocation-api/index.ts` | Add `MAX_MARKDOWN_CHARS` constant, add `normalizeResultRow()` helper, update `sources_searched` to all attempted |

