import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { quoteId } = await req.json();

    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'quoteId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get quote with file info
    const { data: quote } = await supabase
      .from('renovation_quotes')
      .select('id, project_id, file_id, company_id, title, status')
      .eq('id', quoteId)
      .single();

    if (!quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!quote.file_id) {
      return new Response(JSON.stringify({ error: 'Quote has no file attached' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get file info
    const { data: file } = await supabase
      .from('renovation_project_files')
      .select('storage_path, file_name, mime_type')
      .eq('id', quote.file_id)
      .single();

    if (!file) {
      return new Response(JSON.stringify({ error: 'File record not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download file
    const { data: fileData, error: dlError } = await supabase.storage
      .from('renovation-private')
      .download(file.storage_path);

    if (dlError || !fileData) {
      throw new Error(`File download failed: ${dlError?.message || 'no data'}`);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare content for AI
    let userContent: any;
    const isPdf = file.mime_type === 'application/pdf';
    const isImage = file.mime_type?.startsWith('image/');

    if (isPdf || isImage) {
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const dataUrl = `data:${file.mime_type};base64,${base64}`;
      userContent = [
        { type: 'text', text: `Extrais les postes de ce devis : ${file.file_name}` },
        { type: 'image_url', image_url: { url: dataUrl } },
      ];
    } else {
      const textContent = await fileData.text();
      userContent = `Extrais les postes de ce devis (${file.file_name}) :\n\n${textContent.substring(0, 15000)}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en analyse de devis de rénovation immobilière en Suisse.
Extrais chaque poste du devis sous forme d'un tableau JSON. Chaque poste doit avoir :
- "position": numéro d'ordre (int)
- "designation": nom du poste
- "description": description détaillée si disponible
- "quantity": quantité (nombre ou null)
- "unit": unité (m2, ml, pce, forfait, h, etc.)
- "unit_price": prix unitaire HT (nombre ou null)
- "total_price": prix total HT du poste (nombre ou null)
- "tva_rate": taux TVA en % si indiqué (nombre ou null)
- "category": catégorie normalisée parmi : demolition, gros_oeuvre, toiture, menuiserie_ext, menuiserie_int, electricite, plomberie, chauffage_ventilation, peinture_revetements, architecture, divers

En plus des postes, extrais aussi un résumé global :
- "montant_ht": montant total HT
- "montant_tva": montant TVA
- "montant_ttc": montant TTC
- "devise": devise (CHF par défaut)
- "date_devis": date du devis (YYYY-MM-DD ou null)
- "reference_devis": référence/numéro du devis
- "validite": durée de validité si mentionnée
- "conditions": conditions particulières

Réponds avec un JSON : { "items": [...], "summary": { ... } }`
          },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error ${response.status}: ${await response.text()}`);
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || '{}';

    let parsed: any;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { items: [], summary: { raw_text: rawContent } };
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const summary = parsed.summary || {};

    // Atomic replacement via RPC
    const { error: rpcError } = await supabase.rpc('renovation_replace_quote_items', {
      _quote_id: quoteId,
      _items: JSON.stringify(items),
      _analysis_result: JSON.stringify({ summary, item_count: items.length }),
    });

    if (rpcError) {
      throw new Error(`RPC error: ${rpcError.message}`);
    }

    // Update quote amounts from summary
    const updateData: any = {};
    if (summary.montant_ht) updateData.amount_ht = summary.montant_ht;
    if (summary.montant_ttc) updateData.amount_ttc = summary.montant_ttc;
    if (summary.reference_devis) updateData.reference = summary.reference_devis;

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('renovation_quotes')
        .update(updateData)
        .eq('id', quoteId);
    }

    // Audit log
    await supabase.from('renovation_audit_logs').insert({
      project_id: quote.project_id,
      user_id: null,
      action: 'quote_analyzed',
      target_table: 'renovation_quotes',
      target_id: quoteId,
      new_data: { item_count: items.length, amount_ht: summary.montant_ht },
    });

    return new Response(JSON.stringify({
      status: 'analyzed',
      item_count: items.length,
      summary,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
