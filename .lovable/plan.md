

## Plan — Fix 3 Urgent Issues

### Issue 1: Offres count stuck at 1000

**Root cause**: Several pages fetch offres without `.limit()` or pagination, hitting Supabase's default 1000-row cap.

**Affected files**:
- `src/pages/admin/Dashboard.tsx` (line 155): `.from('offres').select('*')` — no limit at all
- `src/pages/admin/OffresEnvoyees.tsx` (line 264): has `.limit(15000)` — already fixed but loads ALL offre columns
- `src/pages/admin/Clients.tsx` (line 201): has `.limit(15000)` for today's offres — OK

**Fix**:
- In `Dashboard.tsx`: use `fetchAllPaginated` for the offres query (same pattern already used in `Calendrier.tsx`), or add `.limit(15000)` as a minimum fix. Since Dashboard only needs `offres.length` (total count), switch to a `count: 'exact', head: true` query instead of fetching all rows — much faster.
- In `OffresEnvoyees.tsx`: use `fetchAllPaginated` to properly paginate through all offres instead of relying on a high `.limit()`.

---

### Issue 2: Slow client-side page loads

**Root cause**: Pages like `client/Dashboard.tsx`, `admin/Dashboard.tsx`, `admin/Clients.tsx`, and `agent/MesClients.tsx` make 4-7 sequential/parallel large queries fetching entire tables into memory before rendering.

**Fixes**:
- **Admin Dashboard**: Replace `select('*')` on offres with `select('id', { count: 'exact', head: true })` since only the count is used. Same for transactions — only stats are computed, use count queries where possible.
- **Client Dashboard**: Already scoped to a single client, so this is less of an issue. Ensure queries use proper indexes (they already filter by `client_id`).
- **Admin Clients page**: The biggest bottleneck — loads ALL clients + ALL profiles + ALL candidates + today's offres. Add server-side pagination: show 50 clients per page with a "Load more" or pagination component.
- **Agent MesClients**: Already scoped by agent, likely manageable. Add `.limit()` where missing.

---

### Issue 3: Optimize client filtering for grouped search by criteria

**Root cause**: Admin `Clients.tsx` already has region and pieces filters, but filtering is entirely client-side after loading all data. Need better grouped/criteria-based search.

**Fixes**:
- Add additional filter options: `budget range`, `type_recherche` (Louer/Acheter), `type_permis`, `statut`, `type_contrat`
- Add a budget range filter (slider or min/max inputs)
- Add type_recherche filter (Louer/Acheter/Tous)
- Add type_permis filter dropdown
- Apply these same filter improvements to `agent/MesClients.tsx` for consistency
- Add a result counter showing "X client(s) trouvé(s)" (already a known pattern per memory)

---

### Files to modify

| File | Changes |
|---|---|
| `src/pages/admin/Dashboard.tsx` | Replace offres `select('*')` with count-only query |
| `src/pages/admin/OffresEnvoyees.tsx` | Use `fetchAllPaginated` for offres loading |
| `src/pages/admin/Clients.tsx` | Add budget/type_recherche/type_permis/statut filters, add pagination (50 per page), add result counter |
| `src/pages/agent/MesClients.tsx` | Add budget/type_permis filters for consistency, add result counter |

### Implementation order

1. Fix Dashboard offres count (count-only query)
2. Fix OffresEnvoyees pagination with `fetchAllPaginated`
3. Add advanced filters + pagination to admin Clients
4. Add matching filters to agent MesClients

