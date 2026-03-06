

## Bug: Agent activation blocked by RLS policy

### Root Cause
The `agents` table has an UPDATE RLS policy: `"Admins can update agents"` which only allows users with the `admin` role. When an agent logs in and the AuthContext tries to update their status from `en_attente` to `actif`, the update is silently rejected by RLS (Supabase returns no error, just 0 rows affected).

### Fix (2 parts)

**1. Database: Create a SECURITY DEFINER function to activate agents**

```sql
CREATE OR REPLACE FUNCTION public.activate_agent_on_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agents
  SET statut = 'actif', updated_at = now()
  WHERE user_id = auth.uid()
    AND statut = 'en_attente';
END;
$$;
```

Same pattern for `activate_apporteur_on_login()` and `activate_coursier_on_login()` since they have the same logic.

**2. Code: Update AuthContext to use the RPC function instead of direct update**

In `src/contexts/AuthContext.tsx`, replace the direct `.update()` calls with `.rpc('activate_agent_on_login')` (and similar for apporteur/coursier). This bypasses RLS via SECURITY DEFINER.

**3. Manually activate Carina and Oriane now**

Run a migration to set their status to `actif`:
```sql
UPDATE agents SET statut = 'actif' WHERE user_id IN (
  'a45396b5-d95c-4680-9cf3-e9b2332b63de',
  '9c2f4153-8526-443a-9753-be680ed93ed1'
);
```

### Files
- **Database migration**: Create 3 SECURITY DEFINER functions + fix Carina/Oriane
- `src/contexts/AuthContext.tsx`: Replace direct updates with RPC calls

