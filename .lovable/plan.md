

## Problem Identified

The issue is NOT that the buttons don't work -- they DO update the status. The real problem is that **there are duplicate visit entries in your database**. For example, "Chem. de Bonne-Espérance 12" appears 3 times with different IDs but the exact same data (same client, same agent, same date). When you click "Accepter" on one, it updates that specific entry, but the duplicates remain unchanged with their buttons still active.

## Plan

### Step 1: Clean up existing duplicates
Remove all duplicate visits from the database, keeping only one entry per unique combination of (address, client, agent, date).

### Step 2: Prevent future duplicates
Add a check in the code that creates visits (in the client Messagerie and other pages) to verify if a visit with the same address, client, agent, and date already exists before inserting a new one. This prevents the "double-click" or "re-submit" problem.

### Step 3: Add a database constraint
Add a unique constraint on the `visites` table for the combination of `(offre_id, client_id, agent_id, date_visite)` to prevent duplicates at the database level as a safety net.

---

### Technical Details

**Database cleanup SQL:**
- Identify duplicates grouped by `(adresse, client_id, agent_id, date_visite)` where `statut = 'planifiee'`
- Delete all but the oldest entry (smallest `created_at`) in each group

**Code changes:**
- In files that insert into the `visites` table (e.g., `src/pages/client/Messagerie.tsx`, `src/pages/agent/Messagerie.tsx`), add a pre-check: query for an existing visit with the same parameters before inserting
- Add a unique index on `visites(offre_id, client_id, agent_id, date_visite)` to enforce uniqueness at the DB level

**Files to modify:**
- `src/pages/client/Messagerie.tsx` -- add duplicate check before insert
- `src/pages/agent/Messagerie.tsx` -- add duplicate check before insert
- Database migration -- cleanup + unique constraint
