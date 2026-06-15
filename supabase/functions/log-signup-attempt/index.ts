// Public endpoint to log signup attempts (success, failures, lead-only fallback).
// Called from public signup forms so admin can recover lost registrations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  source?: string;
  parcours?: string;
  stage: 'auth_signup_failed' | 'provision_failed' | 'succeeded' | 'lead_only';
  error_message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Payload;

    if (!body?.email || !body?.stage) {
      return new Response(
        JSON.stringify({ error: 'email and stage are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validStages = ['auth_signup_failed', 'provision_failed', 'succeeded', 'lead_only'];
    if (!validStages.includes(body.stage)) {
      return new Response(
        JSON.stringify({ error: 'invalid stage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const userAgent = req.headers.get('user-agent') || null;

    const { error } = await admin.from('signup_attempts').insert({
      email: String(body.email).trim().toLowerCase().slice(0, 255),
      phone: body.phone?.slice(0, 50) || null,
      first_name: body.first_name?.slice(0, 100) || null,
      last_name: body.last_name?.slice(0, 100) || null,
      source: body.source?.slice(0, 100) || null,
      parcours: body.parcours?.slice(0, 50) || null,
      stage: body.stage,
      error_message: body.error_message?.slice(0, 1000) || null,
      user_agent: userAgent?.slice(0, 500) || null,
    });

    if (error) {
      console.error('signup_attempts insert error', error);
      return new Response(
        JSON.stringify({ error: 'log_failed', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('log-signup-attempt fatal', e);
    return new Response(
      JSON.stringify({ error: 'unexpected', details: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
