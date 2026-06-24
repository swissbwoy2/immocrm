// Public signup completion: creates profile + assigns 'client' role server-side.
// Idempotent. Called from public landing forms after supabase.auth.signUp().
// When user_id is omitted, falls back to email lookup (for "user already registered"
// flow) and only creates profile/role rows if missing — never overwrites existing data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  user_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  source?: string;
  parcours?: 'location' | 'achat' | 'vente' | 'renovation' | 'relocation' | 'locataire-sortant';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Payload;

    if (!body?.email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Resolve auth user id
    let userId = body.user_id || '';
    let existingProfile = false;

    if (userId) {
      const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId);
      if (authErr || !authUser?.user) {
        return new Response(
          JSON.stringify({ error: 'auth user not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Lookup by email (paginated)
      let found: { id: string } | null = null;
      for (let page = 1; page <= 20 && !found; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const match = data?.users?.find((u) => (u.email || '').toLowerCase() === body.email.toLowerCase());
        if (match) found = { id: match.id };
        if (!data?.users?.length || data.users.length < 200) break;
      }
      if (!found) {
        return new Response(
          JSON.stringify({ error: 'auth user not found for email' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = found.id;
    }

    // Check if profile already exists — if so, do NOT overwrite anything
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    existingProfile = !!existing;

    // Normalize parcours: 'locataire-sortant' is a marketing label that maps to 'location'
    const normalizedParcours =
      body.parcours === 'locataire-sortant' ? 'location' : (body.parcours || 'location');

    if (!existingProfile) {
      const { error: profileErr } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email: body.email,
          prenom: body.first_name || '',
          nom: body.last_name || '',
          telephone: body.phone || null,
          actif: true,
          parcours_type: normalizedParcours,
        });

      if (profileErr) {
        console.error('profile insert error', profileErr);
        return new Response(
          JSON.stringify({ error: 'profile_failed', details: profileErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Ensure 'client' role exists (idempotent)
    const { data: existingRole } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleErr } = await admin
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });
      if (roleErr && !String(roleErr.message || '').toLowerCase().includes('duplicate')) {
        console.error('role insert error', roleErr);
        return new Response(
          JSON.stringify({ error: 'role_failed', details: roleErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: userId, profile_existed: existingProfile, source: body.source || null }),
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
