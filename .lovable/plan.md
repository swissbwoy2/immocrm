

## Implementation Plan — Meta Lead Ads Integration

The plan has been validated. Here is the execution order:

### Step 1 — Request 4 Meta Secrets
Use `add_secret` for each:
- `META_APP_ID` — Meta App identifier
- `META_APP_SECRET` — SHA256 webhook signature validation
- `META_VERIFY_TOKEN` — Webhook handshake verification (user-chosen value)
- `META_PAGE_ACCESS_TOKEN` — Long-lived token for Graph API lead retrieval

### Step 2 — SQL Migration
Create two tables with RLS, indexes, and trigger:

**`meta_leads`** — all specified columns including `is_organic boolean`, `notes text`, `ad_reference_label`, `ad_reference_url`, `raw_answers jsonb`, `raw_meta_payload jsonb`, `lead_status text default 'new'`, `assigned_to uuid`, plus all campaign/adset/ad/form/page IDs and names.

**`meta_lead_logs`** — enriched with `leadgen_id`, `page_id`, `form_id`, `ad_id`, `event_type`, `status`, `payload jsonb`, `error_message`.

**Indexes**: `leadgen_id`, `created_at`, `lead_status`, `campaign_id`, `ad_id`, `form_id` on meta_leads; `leadgen_id` on meta_lead_logs.

**RLS**: SELECT/UPDATE admin-only via `has_role(auth.uid(), 'admin')`. No public INSERT.

**Trigger**: `updated_at` on meta_leads.

### Step 3 — Edge Function `meta-leads-webhook`
File: `supabase/functions/meta-leads-webhook/index.ts`
Config: `verify_jwt = false`

- **GET**: Validate `hub.verify_token` → return `hub.challenge`
- **POST**: Validate SHA256 signature → log raw payload with all IDs → deduplicate by `leadgen_id` → fetch lead via Graph API (`/{leadgen_id}?fields=field_data,created_time,ad_id,campaign_id,form_id,is_organic`) → enrich ad/adset/campaign/form/page names via separate Graph calls → build `ad_reference_label` → insert via `service_role` → notify admins via `create_notification` → retry 1x on failure

### Step 4 — Admin Page `MetaLeads.tsx`
File: `src/pages/admin/MetaLeads.tsx`

**List view**: search, filters (status, campaign, form, date range), columns (date, nom, email, phone, formulaire, campagne, adset, publicité, statut Badge, assigné à), sorted by date desc.

**Detail Dialog** (4 blocks):
1. Contact (nom, email, phone, city, postal_code)
2. Origine Meta (source, page_name, form, campaign, adset, ad, is_organic, all IDs, ad_reference_label)
3. Réponses formulaire (raw_answers key→value)
4. Suivi CRM (status select, agent assignment, notes textarea)

### Step 5 — Routing + Sidebar
- **App.tsx** line ~79: add `const AdminMetaLeads = lazy(() => import("./pages/admin/MetaLeads"));`
- **App.tsx** line ~289: add route `<Route path="/admin/meta-leads" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMetaLeads /></AppLayout></ProtectedRoute>} />`
- **AppSidebar.tsx** line 42: add `{ name: 'Leads Meta Ads', icon: Tag, path: '/admin/meta-leads', notifKey: null }` after "Leads Shortlist"

