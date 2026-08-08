import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_USER_ID = '315ba171-c230-406f-acaa-75326ce5b5ea';
const TARGET_EMAIL = 'remi.martinent@hotmail.fr';

function genPassword(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, 'x');
  return `Lg${b64}9!`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = genPassword();
  const { data: existing } = await admin.auth.admin.getUserById(TARGET_USER_ID);
  const meta = { ...(existing?.user?.user_metadata ?? {}), must_change_password: true };

  const { error } = await admin.auth.admin.updateUserById(TARGET_USER_ID, {
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
    body: JSON.stringify({
      templateName: 'client-credentials',
      recipientEmail: TARGET_EMAIL,
      idempotencyKey: `client-credentials-${TARGET_EMAIL}-${Date.now()}`,
      templateData: {
        siteUrl: 'https://logisorama.ch',
        recipient: TARGET_EMAIL,
        tempPassword: password,
        prenom: 'Rémi',
      },
    }),
  });
  const body = await res.text();

  return new Response(JSON.stringify({ success: res.ok, emailStatus: res.status, body }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
