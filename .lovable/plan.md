

## Analysis: Pass 2 — What's done vs. what's missing

All 6 files exist and are functional. The core structure is solid. Below are the **gaps** between the spec and the current implementation.

---

### 1. OffersTab.tsx — 3 gaps

| Spec requirement | Status |
|---|---|
| Client column | Done |
| Properties count | **Missing** — `property_result_ids` array length not shown |
| Channel column | Done |
| Status column | Done |
| Approval required | Done |
| **Approved by** | **Missing** |
| **Approved at** | **Missing** |
| Created at | Done |
| **Status filter** | **Missing** |
| Preview / Edit / Approve / Reject actions | Done |
| Loading / empty / error states | Done |

**Fix**: Add `property_result_ids` count column, `approved_by`/`approved_at` columns (if those fields exist on the table), and a status `Select` filter like ApprovalsTab has.

---

### 2. VisitsTab.tsx — 2 gaps

| Spec requirement | Status |
|---|---|
| Client | Done |
| Property | Done |
| Status | Done |
| Approval required | Done |
| **Sent at** | **Missing column** |
| Confirmed date | Done |
| **Assigned to** | **Missing column** |
| **Created at** | **Missing column** |
| **Status filter** | **Missing** |
| Approve/Reject/Cancel actions | Done |
| CRM visit creation | Done (bonus) |

**Fix**: Add `sent_at`, `assigned_to`, `created_at` columns to the table and a status `Select` filter.

---

### 3. VisitDetailDrawer.tsx — 1 gap

| Spec requirement | Status |
|---|---|
| contact_message | Done |
| proposed_slots | Done |
| source_response | Done |
| confirmed_date | Done |
| assigned_to | Done |
| **error_message** | **Missing** |

**Fix**: Add `error_message` display section (like `notes`).

---

### 4. ApprovalsTab.tsx — 3 gaps

| Spec requirement | Status |
|---|---|
| Server-side pagination | Done |
| Status filter | Done |
| **Request type filter** | **Missing** |
| **Client column** | **Missing** — no client join |
| **Decided by column** | **Missing** |
| **Decided at column** | **Missing** |
| Decision notes dialog | Done |
| Downstream actions (offers/visits) | Done (bonus) |

**Fix**: Add `request_type` filter, join client data if `client_id` exists on the table, and add `decided_by`/`decided_at` columns.

---

### 5. ActivityLogTab.tsx — 4 gaps

| Spec requirement | Status |
|---|---|
| Pagination | Done |
| Action type filter | Done |
| Error search | Done |
| Client column | Done |
| Action source | Done |
| Connector used | Done |
| Error message | Done |
| Validation result | Done |
| **Mission column** | **Missing** — `mission_id` not shown |
| **Property result column** | **Missing** — `property_result_id` not shown |
| **Validation required column** | **Missing** |
| **Validation result filter** | **Missing** |
| **Connector used filter** | **Missing** |
| **Date range filter** | **Missing** |
| **Error row visual emphasis** | **Missing** — text is red but no row-level highlight |

**Fix**: Add missing columns (`mission_id`, `property_result_id`, `validation_required`), add `validation_result` and `connector_used` Select filters, add date range inputs, and highlight rows with errors.

---

### 6. OfferPreviewDialog.tsx — Complete

No gaps found. Draft editing, status display, linked properties count, save mutation all present.

---

### 7. SendOfferDialog.tsx — Bonus (not in spec)

Already implemented with property selection, email sending via `send-smtp-email`, and notification creation. No changes needed.

---

### 8. AgentIA.tsx — Complete

All 8 tabs wired. No changes needed.

---

## Implementation plan

### Phase 1 — OffersTab: add missing columns + status filter
- Add `Select` for status filtering (brouillon, pret, en_attente_validation, envoye, refuse)
- Add property count column: `Array.isArray(o.property_result_ids) ? o.property_result_ids.length : 0`
- Add `approved_by` and `approved_at` columns (display if present on the record)

### Phase 2 — VisitsTab: add missing columns + status filter
- Add `sent_at`, `assigned_to`, `created_at` columns
- Add `Select` for status filtering

### Phase 3 — VisitDetailDrawer: add error_message
- Add `error_message` section below notes

### Phase 4 — ApprovalsTab: add request_type filter + missing columns
- Add `Select` for `request_type` filtering
- Add `decided_by` and `decided_at` columns
- Add client join if `client_id` column exists on `approval_requests`

### Phase 5 — ActivityLogTab: add missing columns + filters
- Add `mission_id`, `property_result_id`, `validation_required` columns
- Add `validation_result` and `connector_used` Select filters
- Add date range filter (two date inputs)
- Add row-level highlight for entries with `error_message`

All changes are UI-only. No schema changes, no new edge functions.

