// Public signup completion: creates profile + assigns 'client' role server-side.
// Idempotent. Called from public landing forms after supabase.auth.signUp().
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  source?: string;
  parcours?: 'location' | 'achat' | 'vente' | 'renovation' | 'relocation';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Payload;

    if (!body?.user_id || !body?.email) {
      return new Response(
        JSON.stringify({ error: 'user_id and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the auth user actually exists (prevents arbitrary forged user_ids)
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(body.user_id);
    if (authErr || !authUser?.user) {
      return new Response(
        JSON.stringify({ error: 'auth user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1) Upsert profile (idempotent on id)
    const { error: profileErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: body.user_id,
          email: body.email,
          prenom: body.first_name || '',
          nom: body.last_name || '',
          telephone: body.phone || null,
          actif: true,
          parcours_type: body.parcours || 'location',
        },
        { onConflict: 'id' }
      );

    if (profileErr) {
      console.error('profile upsert error', profileErr);
      return new Response(
        JSON.stringify({ error: 'profile_failed', details: profileErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2) Assign 'client' role (ignore conflict)
    const { error: roleErr } = await admin
      .from('user_roles')
      .insert({ user_id: body.user_id, role: 'client' });

    // Unique-violation = role already present, that's fine
    if (roleErr && !String(roleErr.message || '').toLowerCase().includes('duplicate')) {
      console.error('role insert error', roleErr);
      return new Response(
        JSON.stringify({ error: 'role_failed', details: roleErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, source: body.source || null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('create-public-user fatal', e);
    return new Response(
      JSON.stringify({ error: 'unexpected', details: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
