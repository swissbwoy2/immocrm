import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK = 'https://logisorama.ch';

// Allowlist of domains we permit redirecting to from tracking links.
// Anything else is sent to FALLBACK to prevent the endpoint being abused
// as an open redirect in phishing campaigns.
const ALLOWED_HOSTS = [
  'logisorama.ch',
  'www.logisorama.ch',
  'immo-rama.ch',
  'www.immo-rama.ch',
  'immocrm.lovable.app',
  'app.logisorama.ch',
  'lovable.app',
  'lovableproject.com',
  // Common real-estate portals used in agency emails
  'homegate.ch',
  'www.homegate.ch',
  'immoscout24.ch',
  'www.immoscout24.ch',
  'flatfox.ch',
  'www.flatfox.ch',
  'immostreet.ch',
  'www.immostreet.ch',
  'comparis.ch',
  'www.comparis.ch',
  'newhome.ch',
  'www.newhome.ch',
  // App stores (update / install campaigns)
  'apps.apple.com',
  'itunes.apple.com',
  'testflight.apple.com',
  'play.google.com',
];

function isAllowed(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith('.' + allowed),
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const logId = url.searchParams.get('id');
  const target = url.searchParams.get('url');

  const dest = target && isAllowed(target) ? target : FALLBACK;

  try {
    if (logId && /^[0-9a-f-]{36}$/i.test(logId)) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      supabase.rpc('track_email_click', { _log_id: logId, _url: dest }).then(({ error }) => {
        if (error) console.error('track_email_click error:', error.message);
      });
    }
  } catch (e) {
    console.error('track-email-click exception:', e);
  }

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: dest },
  });
});
