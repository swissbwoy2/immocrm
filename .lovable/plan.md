

## Problem: Missing Calendar Events

The admin calendar shows no events after ~March 14 because the database has **1072 visites** but Supabase has a **default query limit of 1000 rows**. The query fetches all visites sorted ascending, so the newest 72 records (mid-March onward) are silently cut off.

The `calendar_events` table (91 rows) and other tables are unaffected — this is purely a visites overflow issue.

## Fix

**File: `src/pages/admin/Calendrier.tsx`** (line 78)

Add `.limit(5000)` to the visites query to raise the cap well above the current row count. This is the simplest reliable fix:

```ts
// Before
supabase.from('visites').select('*, offres(*)').order('date_visite', { ascending: true }),

// After  
supabase.from('visites').select('*, offres(*)').order('date_visite', { ascending: true }).limit(5000),
```

Optionally also add `.limit(5000)` to `calendar_events` and `candidatures` queries as a safeguard, even though they're currently under 1000.

**Same fix for client/proprietaire calendars** if they could also grow beyond 1000 rows — but those are scoped by `client_id`/`proprietaire_id` so they're unlikely to hit the cap. No change needed there for now.

This is a one-line fix in one file.

