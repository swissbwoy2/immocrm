// Diagnostic AbaNinja (temporaire). Protégé par INTERNAL_FUNCTION_SECRET.
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
  const h = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const body = await req.json().catch(() => ({}));
  const out: Record<string, unknown> = {};

  if (body.mode === 'create-test') {
    const personUuid = String(body.person_uuid || '');
    const addressUuid = String(body.address_uuid || '');
    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + 10);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const payload = {
      documents: [{
        receiver: { personUuid, addressUuid },
        invoiceDate: fmt(today),
        dueDate: fmt(due),
        currencyCode: 'CHF',
        title: 'TEST DIAG - a supprimer',
        reference: 'TEST-DIAG',
        publicNotes: 'test',
        terms: 'test',
        footerText: 'www.immo-rama.ch',
        paymentInstructions: { qrIban: 'CH0630808006356407396' },
        documentTotal: 300,
        pricesIncludeVat: true,
        positions: [{
          kind: 'product', positionNumber: 1,
          productDescription: 'Test diag', additionalDescription: 'test',
          quantity: 1, singlePrice: 300, positionTotal: 300,
          vat: { percentage: 0, amount: 0 },
        }],
      }],
    };
    const r = await fetch(`${base}/documents/v2/invoices`, { method: 'POST', headers: h, body: JSON.stringify(payload) });
    const t = await r.text();
    out.create = { status: r.status, body: t.slice(0, 4000) };
    try {
      const j = JSON.parse(t);
      const uuid = j.data?.[0]?.uuid || j.data?.documents?.[0]?.uuid;
      if (uuid) {
        const del = await fetch(`${base}/documents/v2/invoices/${uuid}`, { method: 'DELETE', headers: h });
        out.delete = { uuid, status: del.status, body: (await del.text()).slice(0, 500) };
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const probe = async (label: string, url: string) => {
    const r = await fetch(url, { headers: h });
    return { label, status: r.status, body: (await r.text()).slice(0, 20000) };
  };

  const u = String(body.person_uuid);
  const results = [
    await probe('addr', `${base}/addresses/v2/addresses/${u}`),
    await probe('person', `${base}/addresses/v2/persons/${u}`),
    await probe('list', `${base}/addresses/v2/addresses?limit=3`),
  ];
  return new Response(JSON.stringify({ results }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
