import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const logId = url.searchParams.get('id');
  const target = url.searchParams.get('url');

  const fallback = 'https://logisorama.ch';
  const dest = target && /^https?:\/\//i.test(target) ? target : fallback;

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
