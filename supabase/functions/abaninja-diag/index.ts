// Diagnostic READ-ONLY AbaNinja : vérifie les credentials et l'accès API.
// Protégé par INTERNAL_FUNCTION_SECRET (header x-internal-secret).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get('INTERNAL_FUNCTION_SECRET') ?? '';
  if (!secret || req.headers.get('x-internal-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('ABANINJA_API_KEY') ?? '';
  const accountUuid = Deno.env.get('ABANINJA_ACCOUNT_UUID') ?? '';
  const base = `https://api.abaninja.ch/accounts/${accountUuid}`;
  const h = { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' };

  const probe = async (label: string, url: string) => {
    try {
      const r = await fetch(url, { headers: h });
      const t = await r.text();
      return { label, status: r.status, body: t.slice(0, 600) };
    } catch (e) {
      return { label, status: 0, body: e instanceof Error ? e.message : String(e) };
    }
  };

  const results = [
    await probe('bank-accounts', `${base}/finances/v2/bank-accounts`),
    await probe('invoices', `${base}/documents/v2/invoices?limit=5`),
  ];

  return new Response(JSON.stringify({ hasApiKey: !!apiKey, hasAccountUuid: !!accountUuid, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
