

## Step 3 — Implementation Plan: Agent IA Relocation Admin Module

### Overview
Replace `OpenClaw.tsx` with a complete 8-tab admin module at `/admin/agent-ia`. ~15 new files, 2 edits, 1 deletion.

### Confirmed Schema Details
- **Client identity join**: `clients:client_id(id, user_id, profiles:user_id(prenom, nom, email))` — confirmed via `clients_user_id_fkey` → `profiles(id)` (oneToOne)
- **AI agent selection**: `ai_agents` has `status` field. Will use `.eq('status', 'active').single()` instead of raw `limit(1)`, with a comment explaining fallback
- **All enums confirmed**: `mission_status`, `execution_run_status`, `property_result_status`, `offer_status`, `visit_request_status`, `approval_status`, `approval_type`, `score_label`, `mission_frequency`

### Files to Modify

**`src/App.tsx`** (line 80, line 293):
- Replace `AdminOpenClaw` lazy import → `AdminAgentIA` from `./pages/admin/AgentIA`
- Route `/admin/agent-ia` instead of `/admin/openclaw`

**`src/components/AppSidebar.tsx`** (line 71):
- Label: `'Agent IA Relocation'`, path: `/admin/agent-ia`

### Files to Delete
- `src/pages/admin/OpenClaw.tsx`

### Files to Create

**`src/pages/admin/AgentIA.tsx`** — Main page with 8 tabs (Dashboard, Clients, Missions, Résultats, Offres, Visites, Validations, Journal). Fetches `ai_agents` with `.eq('status', 'active').single()`. Uses `PremiumPageHeader` with Bot icon.

**`src/components/admin/ai-relocation/statusBadges.tsx`** — Shared `StatusBadge` component with color maps for all enums. Consistent badge styling across all tabs.

**`src/components/admin/ai-relocation/AgentIADashboard.tsx`** — 9 KPI cards via `PremiumKPICard`. Count queries on each table. Recent activity timeline (last 10 from `ai_agent_activity_logs`).

**`src/components/admin/ai-relocation/AssignedClientsTab.tsx`** — Table of `ai_agent_assignments` with client name join. Actions: assign (dialog), pause/resume/deactivate (direct update). Loading/empty/error states.

**`src/components/admin/ai-relocation/AssignmentDialog.tsx`** — Dialog form for create/edit assignment. Client select, priority, urgency, sources, approval toggles, auto settings, notes. Direct insert/update on `ai_agent_assignments`.

**`src/components/admin/ai-relocation/MissionsTab.tsx`** — Table of `search_missions` with client join. Create/run via `supabase.functions.invoke('ai-relocation-api')`. Pause/resume/terminate via direct update.

**`src/components/admin/ai-relocation/MissionDetailDrawer.tsx`** — Sheet showing criteria snapshot, execution runs from `mission_execution_runs`, counters.

**`src/components/admin/ai-relocation/SearchResultsTab.tsx`** — Table with server-side pagination (`.range()`, 50/page), default sort `created_at desc`. Text search on `title`, `address`, `city` via `.or('title.ilike.%term%,address.ilike.%term%,city.ilike.%term%')`. Filters: client, mission, source, status, score range, duplicate. Actions: update status (direct), prepare offer/visit (API).

**`src/components/admin/ai-relocation/ResultDetailDrawer.tsx`** — Full property details + score breakdown from `property_result_scores`.

**`src/components/admin/ai-relocation/OffersTab.tsx`** — Table of `client_offer_messages` with client join, status badges. Edit draft (direct), approve/reject (direct).

**`src/components/admin/ai-relocation/OfferPreviewDialog.tsx`** — Dialog showing/editing `message_body` and linked `property_result_ids`.

**`src/components/admin/ai-relocation/VisitsTab.tsx`** — Table of `visit_requests` with client + property joins. Approve/reject/confirm/cancel (direct update).

**`src/components/admin/ai-relocation/VisitDetailDrawer.tsx`** — Proposed slots, source response, contact message.

**`src/components/admin/ai-relocation/ApprovalsTab.tsx`** — Server-side paginated table of `approval_requests` (50/page), filter by status/type. Approve/reject with `decision_notes`.

**`src/components/admin/ai-relocation/ActivityLogTab.tsx`** — Server-side paginated table (100/page), filters: action_type, validation_result, connector_used, text search on `error_message`. Client name join.

### Data Access Rules
- **Reads**: Direct Supabase queries via `useQuery`. Server-side `.range(from, to)` for large tables.
- **Complex actions** (mission create/run, prepare offer, request visit): `supabase.functions.invoke('ai-relocation-api')`
- **Simple status changes** (pause assignment, approve request, update result_status): Direct `.update()`
- **Every tab**: Skeleton during load, empty state message, error state with retry, `toast.error()` on failures

### Implementation Order
**Pass 1**: AgentIA.tsx + statusBadges + Dashboard + AssignedClients + AssignmentDialog + Missions + MissionDetailDrawer + SearchResults + ResultDetailDrawer + App.tsx + Sidebar updates + delete OpenClaw.tsx

**Pass 2**: Offers + OfferPreviewDialog + Visits + VisitDetailDrawer + Approvals + ActivityLog

