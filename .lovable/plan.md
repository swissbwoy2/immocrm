

## Fix: Edge function 403 "AI agent not found or inactive"

### Root cause

The edge function uses `supabase.auth.getClaims(token)` (line 147) which **does not exist** in `@supabase/supabase-js@2.7.1`. This silently fails, causing the function to return 401 before even reaching the agent lookup.

Even if the auth worked, the `user_roles` query (line 155-158) uses the anon client with the user's token, which may be blocked by RLS policies on `user_roles`.

### Fix

**File: `supabase/functions/ai-relocation-api/index.ts`**

1. **Replace `getClaims`** with `supabase.auth.getUser()` which is the correct v2 method:
```ts
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return errorResponse('Invalid token', 401);
}
const userId = user.id;
```

2. **Use `adminClient` for role lookup** to bypass RLS on `user_roles`:
```ts
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const adminClient = createClient(supabaseUrl, serviceKey);

const { data: roles } = await adminClient
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);
```

3. Move the `adminClient` creation **before** the role check so it can be reused.

No other files need changes.

