

## Fix: 401 "Invalid token" still occurring

### Root cause

The `getUser()` call on line 147 doesn't pass the JWT token explicitly. While the client is created with the Authorization header, in `@supabase/supabase-js@2.7.1` (old version used by this function), `getUser()` without a token argument may not use the global headers correctly in Deno edge functions. No error logs appear because there's no `console.log` before the 401 return.

### Fix

**File: `supabase/functions/ai-relocation-api/index.ts`**

1. Extract the JWT token from the auth header
2. Pass it explicitly to `getUser(token)` 
3. Add `console.error` logging so failures are visible in logs

```ts
const token = authHeader.replace('Bearer ', '');
console.log('[ai-relocation-api] Authenticating user...');
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) {
  console.error('[ai-relocation-api] Auth failed:', userError?.message);
  return errorResponse('Invalid token', 401);
}
console.log('[ai-relocation-api] Authenticated as', user.email);
```

Single file change, ~5 lines modified.

