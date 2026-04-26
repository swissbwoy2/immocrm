// Edge Function: demo-login
// Generates a one-time magic link for the demo account and returns
// access/refresh tokens the frontend can plug into supabase.auth.setSession().
// Public endpoint (verify_jwt = false) with naive in-memory IP rate limiting.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEMO_EMAIL = 'demo@immo-rama.ch';
const DEMO_USER_ID = '2e50b7d0-9a76-437c-994d-217c52f0e5e5';

// Naive in-memory rate limit (per cold-start instance)
const RATE_LIMIT = 5; // attempts
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1h
const ipHits = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) return false;
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives. Réessayez dans une heure.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 0. Try to ensure email is renamed to demo@... (idempotent, no-op if already done)
    try {
      await admin.auth.admin.updateUserById(DEMO_USER_ID, {
        email: DEMO_EMAIL,
        email_confirm: true,
      });
    } catch (_e) {
      // ignore — email may already be set, or generated column on some Supabase versions
    }

    // 1. Generate a magiclink for the demo email
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: DEMO_EMAIL,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('generateLink failed:', linkErr);
      return new Response(
        JSON.stringify({ error: 'Impossible de générer la session démo.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Verify the OTP server-side to obtain access/refresh tokens
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: sessionData, error: verifyErr } = await anonClient.auth.verifyOtp({
      type: 'magiclink',
      token_hash: linkData.properties.hashed_token,
    });
    if (verifyErr || !sessionData?.session) {
      console.error('verifyOtp failed:', verifyErr);
      return new Response(
        JSON.stringify({ error: 'Impossible d\'établir la session démo.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Log analytics (best-effort)
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      /* noop */
    }
    admin
      .from('demo_sessions')
      .insert({
        ip_address: ip,
        user_agent: req.headers.get('user-agent') ?? null,
        utm_source: (body.utm_source as string) ?? null,
        utm_medium: (body.utm_medium as string) ?? null,
        utm_campaign: (body.utm_campaign as string) ?? null,
      })
      .then(() => {})
      .catch((e) => console.warn('analytics insert failed', e));

    return new Response(
      JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('demo-login fatal:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
