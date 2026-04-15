import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize category names for deterministic grouping
function normalizeCategory(cat: string | null): string {
  if (!cat) return 'divers';
  const map: Record<string, string> = {
    demolition: 'demolition',
    gros_oeuvre: 'gros_oeuvre',
    toiture: 'toiture',
    menuiserie_ext: 'menuiserie_ext',
    menuiserie_int: 'menuiserie_int',
    electricite: 'electricite',
    plomberie: 'plomberie',
    chauffage_ventilation: 'chauffage_ventilation',
    peinture_revetements: 'peinture_revetements',
    architecture: 'architecture',
    divers: 'divers',
  };
  return map[cat.toLowerCase()] || 'divers';
}

interface GroupedComparison {
  category: string;
  items: Array<{
    designation: string;
    quotes: Array<{
      quote_id: string;
      company_name: string;
      quantity: number | null;
      unit_price: number | null;
      total_price: number | null;
    }>;
    min_total: number;
    max_total: number;
    spread_pct: number;
  }>;
  category_totals: Array<{ quote_id: string; company_name: string; total: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { quoteIds, projectId } = await req.json();

    if (!Array.isArray(quoteIds) || quoteIds.length < 2 || !projectId) {
      return new Response(JSON.stringify({ error: 'At least 2 quoteIds and projectId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: quotes } = await supabase
      .from('renovation_quotes')
      .select('id, project_id, status, company_id, title, amount_ht, amount_ttc')
      .in('id', quoteIds);

    if (!quotes || quotes.length !== quoteIds.length) {
      return new Response(JSON.stringify({ error: 'Some quotes not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const q of quotes) {
      if (q.project_id !== projectId) {
        return new Response(JSON.stringify({ error: `Quote ${q.id} does not belong to project ${projectId}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (q.status !== 'analyzed') {
        return new Response(JSON.stringify({ error: `Quote ${q.id} has not been analyzed yet (status: ${q.status})` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const companyIds = [...new Set(quotes.map(q => q.company_id))];
    const { data: companies } = await supabase
      .from('renovation_companies')
      .select('id, name')
      .in('id', companyIds);

    const companyMap = new Map((companies || []).map(c => [c.id, c.name]));

    const { data: allItems } = await supabase
      .from('renovation_quote_items')
      .select('*')
      .in('quote_id', quoteIds)
      .order('position');

    if (!allItems || allItems.length === 0) {
      return new Response(JSON.stringify({ error: 'No items found in the selected quotes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const categoryGroups = new Map<string, Map<string, Array<{ quote_id: string; item: any }>>>();

    for (const item of allItems) {
      const cat = normalizeCategory(item.category);
      if (!categoryGroups.has(cat)) {
        categoryGroups.set(cat, new Map());
      }
      const catGroup = categoryGroups.get(cat)!;
      const normDesignation = (item.designation || '').toLowerCase().trim();
      if (!catGroup.has(normDesignation)) {
        catGroup.set(normDesignation, []);
      }
      catGroup.get(normDesignation)!.push({ quote_id: item.quote_id, item });
    }

    const comparison: GroupedComparison[] = [];

    for (const [category, designationMap] of categoryGroups) {
      const groupItems: GroupedComparison['items'] = [];
      const categoryTotalsByQuote = new Map<string, number>();

      for (const [designation, entries] of designationMap) {
        const quoteEntries = entries.map(e => ({
          quote_id: e.quote_id,
          company_name: companyMap.get(quotes.find(q => q.id === e.quote_id)?.company_id || '') || 'Inconnu',
          quantity: e.item.quantity,
          unit_price: e.item.unit_price,
          total_price: e.item.total_price,
        }));

        const totals = quoteEntries.map(e => e.total_price || 0).filter(t => t > 0);
        const min = totals.length > 0 ? Math.min(...totals) : 0;
        const max = totals.length > 0 ? Math.max(...totals) : 0;
        const spread = min > 0 ? Math.round(((max - min) / min) * 100) : 0;

        groupItems.push({
          designation: entries[0].item.designation,
          quotes: quoteEntries,
          min_total: min,
          max_total: max,
          spread_pct: spread,
        });

        for (const e of quoteEntries) {
          const current = categoryTotalsByQuote.get(e.quote_id) || 0;
          categoryTotalsByQuote.set(e.quote_id, current + (e.total_price || 0));
        }
      }

      comparison.push({
        category,
        items: groupItems,
        category_totals: Array.from(categoryTotalsByQuote.entries()).map(([qid, total]) => ({
          quote_id: qid,
          company_name: companyMap.get(quotes.find(q => q.id === qid)?.company_id || '') || 'Inconnu',
          total,
        })),
      });
    }

    const globalTotals = quotes.map(q => ({
      quote_id: q.id,
      company_name: companyMap.get(q.company_id) || 'Inconnu',
      amount_ht: q.amount_ht || 0,
      amount_ttc: q.amount_ttc || 0,
    }));

    let aiSynthesis = '';
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (LOVABLE_API_KEY) {
      try {
        const synthesisInput = {
          quotes: globalTotals,
          categories: comparison.map(c => ({
            name: c.category,
            totals: c.category_totals,
            items_with_high_spread: c.items.filter(i => i.spread_pct > 20).map(i => ({
              designation: i.designation,
              spread_pct: i.spread_pct,
              min: i.min_total,
              max: i.max_total,
            })),
          })),
        };

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
                content: `Tu es un expert en rénovation immobilière en Suisse. On te fournit une comparaison structurée de devis.
Rédige une synthèse concise (max 300 mots) en français comprenant :
1. Résumé global : quel devis est le moins cher, de combien
2. Écarts significatifs par catégorie (>20% d'écart)
3. Points d'attention (postes manquants chez certains, prix anormalement bas ou hauts)
4. Recommandation prudente (sans prendre parti, signaler les risques)
Ne produis PAS de JSON, uniquement du texte lisible.`
              },
              { role: 'user', content: JSON.stringify(synthesisInput) },
            ],
          }),
        });

        if (response.ok) {
          const aiResult = await response.json();
          aiSynthesis = aiResult.choices?.[0]?.message?.content || '';
        } else {
          const errBody = await response.text();
          console.error(JSON.stringify({ event: "renovation_error", function: "renovation-compare-quotes", project_id: projectId, error: `AI synthesis error ${response.status}`, context: { quote_ids: quoteIds, response_body: errBody.substring(0, 300) } }));
        }
      } catch (e) {
        console.error(JSON.stringify({ event: "renovation_error", function: "renovation-compare-quotes", project_id: projectId, error: `AI synthesis exception: ${e.message}`, context: { quote_ids: quoteIds } }));
      }
    }

    const result = {
      comparison,
      global_totals: globalTotals,
      ai_synthesis: aiSynthesis,
      compared_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(JSON.stringify({ event: "renovation_error", function: "renovation-compare-quotes", error: err.message }));
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
