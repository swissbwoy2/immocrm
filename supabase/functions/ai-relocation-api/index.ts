import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// === SHARED: Result Ingestion ===

interface ResultRow {
  source_name?: string;
  source_url?: string;
  external_listing_id?: string;
  title?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  canton?: string;
  rent_amount?: number;
  charges_amount?: number;
  total_amount?: number;
  number_of_rooms?: number;
  living_area?: number;
  availability_date?: string;
  description?: string;
  images?: unknown[];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  visit_booking_link?: string;
  application_channel?: string;
  extraction_timestamp?: string;
}

interface IngestParams {
  mission_id: string;
  client_id: string;
  ai_agent_id: string;
  results: ResultRow[];
  criteria?: Record<string, unknown> | null;
}

interface IngestResult {
  inserted: number;
  duplicates: number;
  failed: number;
  ids: string[];
  errors: string[];
}

async function ingestResults(adminClient: SupabaseClient, params: IngestParams): Promise<IngestResult> {
  const { mission_id, client_id, ai_agent_id, results, criteria } = params;
  const out: IngestResult = { inserted: 0, duplicates: 0, failed: 0, ids: [], errors: [] };
  for (const row of results) {
    try {
      if (row.external_listing_id) {
        const { data: existing } = await adminClient.from('property_results').select('id')
          .eq('source_name', row.source_name ?? '').eq('external_listing_id', row.external_listing_id)
          .eq('client_id', client_id).maybeSingle();
        if (existing) { out.duplicates++; continue; }
      }
      const { data: inserted, error } = await adminClient.from('property_results').insert({
        mission_id, client_id, ai_agent_id, source_name: row.source_name, source_url: row.source_url,
        external_listing_id: row.external_listing_id, title: row.title, address: row.address,
        postal_code: row.postal_code, city: row.city, canton: row.canton, rent_amount: row.rent_amount,
        charges_amount: row.charges_amount, total_amount: row.total_amount, number_of_rooms: row.number_of_rooms,
        living_area: row.living_area, availability_date: row.availability_date, description: row.description,
        images: row.images ?? [], contact_name: row.contact_name, contact_email: row.contact_email,
        contact_phone: row.contact_phone, visit_booking_link: row.visit_booking_link,
        application_channel: row.application_channel, extraction_timestamp: row.extraction_timestamp,
        result_status: 'nouveau',
      }).select('id').single();
      if (error) { out.failed++; out.errors.push(`Insert failed for "${row.title}": ${error.message}`); continue; }
      out.inserted++; out.ids.push(inserted.id);
      if (criteria && inserted.id) {
        try { await adminClient.rpc('calculate_match_score', { p_property_result_id: inserted.id, p_criteria: criteria }); }
        catch (scoreErr) { console.error(`Score calc failed for ${inserted.id}:`, scoreErr); }
      }
    } catch (err) { out.failed++; out.errors.push(`Unexpected error for "${row.title}": ${String(err)}`); }
  }
  return out;
}

async function buildCriteriaSnapshot(adminClient: SupabaseClient, clientId: string): Promise<Record<string, unknown>> {
  const { data: client } = await adminClient.from('clients')
    .select('budget_max, pieces, region_recherche, type_bien, souhaits_particuliers, nombre_occupants, demande_mandat_id')
    .eq('id', clientId).single();
  if (!client) return {};
  let mandatData: Record<string, unknown> | null = null;
  if (client.demande_mandat_id) {
    const { data } = await adminClient.from('demandes_mandat')
      .select('budget_max, pieces_recherche, region_recherche, type_bien, type_recherche, nombre_occupants, souhaits_particuliers')
      .eq('id', client.demande_mandat_id).single();
    mandatData = data;
  }
  let mandatRooms: number | null = null;
  if (mandatData?.pieces_recherche && typeof mandatData.pieces_recherche === 'string') {
    const match = (mandatData.pieces_recherche as string).match(/(\d+)/);
    if (match) mandatRooms = parseInt(match[1], 10);
  }
  return {
    budget_max: client.budget_max ?? mandatData?.budget_max ?? null,
    city: client.region_recherche ?? mandatData?.region_recherche ?? null,
    region_recherche: client.region_recherche ?? mandatData?.region_recherche ?? null,
    rooms: client.pieces ?? mandatRooms ?? null,
    surface_min: null,
    type_bien: client.type_bien ?? mandatData?.type_bien ?? null,
    canton: null,
    type_recherche: (mandatData?.type_recherche as string) ?? null,
    nombre_occupants: client.nombre_occupants ?? mandatData?.nombre_occupants ?? null,
    souhaits_particuliers: client.souhaits_particuliers ?? mandatData?.souhaits_particuliers ?? null,
  };
}

// === END SHARED ===

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTH ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Auth: extract token explicitly for Deno edge function compatibility
    const token = authHeader.replace('Bearer ', '');
    console.log('[ai-relocation-api] Authenticating user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('[ai-relocation-api] Auth failed:', userError?.message);
      return errorResponse('Invalid token', 401);
    }
    console.log('[ai-relocation-api] Authenticated as', user.email);
    const userId = user.id;

    // Service role client for privileged queries (bypasses RLS)
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Role check via adminClient to bypass RLS on user_roles
    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const userRoles = (roles ?? []).map((r: { role: string }) => r.role);
    if (!userRoles.includes('agent_ia') && !userRoles.includes('admin')) {
      return errorResponse('Forbidden: agent_ia or admin role required', 403);
    }

    let aiAgent: Record<string, unknown> | null = null;

    if (userRoles.includes('admin')) {
      // Admins can use any active AI agent (agent may not have a user_id)
      const { data } = await adminClient
        .from('ai_agents')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single();
      aiAgent = data;
    } else {
      // agent_ia role: must match user_id
      const { data } = await adminClient
        .from('ai_agents')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      aiAgent = data;
    }

    if (!aiAgent) {
      return errorResponse('AI agent not found or inactive', 403);
    }

    // === ROUTING ===
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/ai-relocation-api\/?/, '/');

    // POST /missions/create
    if (req.method === 'POST' && path === '/missions/create') {
      return await handleMissionsCreate(adminClient, aiAgent, req);
    }

    // POST /missions/:id/run
    const runMatch = path.match(/^\/missions\/([^/]+)\/run$/);
    if (req.method === 'POST' && runMatch) {
      return await handleMissionsRun(adminClient, aiAgent, runMatch[1], req);
    }

    // POST /results/batch
    if (req.method === 'POST' && path === '/results/batch') {
      return await handleResultsBatch(adminClient, aiAgent, req);
    }

    // POST /offers/prepare
    if (req.method === 'POST' && path === '/offers/prepare') {
      return await handleOffersPrepare(adminClient, aiAgent, req);
    }

    // POST /visits/request
    if (req.method === 'POST' && path === '/visits/request') {
      return await handleVisitsRequest(adminClient, aiAgent, req);
    }

    // GET /clients/:id/criteria
    const criteriaMatch = path.match(/^\/clients\/([^/]+)\/criteria$/);
    if (req.method === 'GET' && criteriaMatch) {
      return await handleClientCriteria(adminClient, aiAgent, criteriaMatch[1]);
    }

    // POST /log
    if (req.method === 'POST' && path === '/log') {
      return await handleLog(adminClient, aiAgent, req);
    }

    return errorResponse(`Unknown endpoint: ${req.method} ${path}`, 404);
  } catch (error) {
    console.error('AI Relocation API error:', error);
    return errorResponse('Internal server error', 500);
  }
});

// === ENDPOINT HANDLERS ===

async function handleMissionsCreate(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  req: Request,
) {
  const body = await req.json();
  const { client_id, frequency, allowed_sources } = body;

  if (!client_id) return errorResponse('client_id required', 400);

  // Verify assignment
  const { data: assignment } = await adminClient
    .from('ai_agent_assignments')
    .select('id')
    .eq('ai_agent_id', aiAgent.id)
    .eq('client_id', client_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!assignment) return errorResponse('Client not assigned to this agent', 403);

  const criteria = await buildCriteriaSnapshot(adminClient, client_id);

  // Map frequency to valid DB enum (quotidien|hebdomadaire|manuel)
  const freqMap: Record<string, string> = { daily: 'quotidien', weekly: 'hebdomadaire', manual: 'manuel' };
  const mappedFrequency = freqMap[frequency] || frequency || 'manuel';

  const { data: mission, error } = await adminClient
    .from('search_missions')
    .insert({
      ai_agent_id: aiAgent.id,
      client_id,
      criteria_snapshot: criteria,
      frequency: mappedFrequency,
      allowed_sources: allowed_sources ?? [],
      status: 'active',
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  await logActivity(adminClient, aiAgent.id as string, {
    action_type: 'mission_created',
    client_id,
    metadata: { mission_id: mission.id },
  });

  return jsonResponse({ data: mission });
}

// === SCRAPING & AI EXTRACTION ENGINE ===

interface SearchPortal {
  name: string;
  buildUrl: (city: string, rooms: number | null, budget: number | null, type: string | null) => string;
}

// Mapping from short alias (used in allowed_sources) to portal name
const SOURCE_ALIASES: Record<string, string> = {
  immoscout: 'immoscout24.ch',
  immoscout24: 'immoscout24.ch',
  homegate: 'homegate.ch',
  flatfox: 'flatfox.ch',
  immobilier: 'immobilier.ch',
  'acheter-louer': 'acheter-louer.ch',
  comparis: 'comparis.ch',
};

const SEARCH_PORTALS: SearchPortal[] = [
  {
    name: 'immoscout24.ch',
    buildUrl: (city, rooms, budget) => {
      const params = new URLSearchParams();
      if (rooms) params.set('nrf', String(rooms));
      if (budget) params.set('prf', String(budget));
      return `https://www.immoscout24.ch/fr/immobilier/louer/lieu-${encodeURIComponent(city)}?${params}`;
    },
  },
  {
    name: 'homegate.ch',
    buildUrl: (city, rooms, budget) => {
      const params = new URLSearchParams();
      if (rooms) params.set('ac', String(rooms));
      if (budget) params.set('ah', String(budget));
      return `https://www.homegate.ch/fr/louer/immobilier/${encodeURIComponent(city)}/correspondant?${params}`;
    },
  },
  {
    name: 'flatfox.ch',
    buildUrl: (city, rooms, budget) => {
      const params = new URLSearchParams();
      params.set('city', city);
      if (rooms) params.set('rooms_min', String(rooms));
      if (budget) params.set('price_max', String(budget));
      return `https://flatfox.ch/fr/search/?${params}`;
    },
  },
  {
    name: 'immobilier.ch',
    buildUrl: (city, rooms, budget) => {
      const params = new URLSearchParams();
      params.set('location', city);
      if (rooms) params.set('rooms', String(rooms));
      if (budget) params.set('price_to', String(budget));
      return `https://www.immobilier.ch/fr/annonces/louer?${params}`;
    },
  },
  {
    name: 'acheter-louer.ch',
    buildUrl: (city, rooms, budget) => {
      const params = new URLSearchParams();
      params.set('location', city);
      if (rooms) params.set('rooms', String(rooms));
      if (budget) params.set('maxprice', String(budget));
      return `https://www.acheter-louer.ch/fr/louer?${params}`;
    },
  },
  {
    name: 'comparis.ch',
    buildUrl: (city, rooms, budget) => {
      const params = new URLSearchParams();
      params.set('requestobject.cityname', city);
      if (rooms) params.set('requestobject.numberofrooms', String(rooms));
      if (budget) params.set('requestobject.priceto', String(budget));
      return `https://www.comparis.ch/immobilien/result/list?${params}`;
    },
  },
];

async function scrapeUrl(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) { console.error('FIRECRAWL_API_KEY not configured'); return null; }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
        location: { country: 'CH', languages: ['fr'] },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`Firecrawl error for ${url}:`, data);
      return null;
    }
    return data?.data?.markdown || data?.markdown || null;
  } catch (err) {
    console.error(`Firecrawl exception for ${url}:`, err);
    return null;
  }
}

async function extractListingsWithAI(markdown: string, sourceName: string, sourceUrl: string): Promise<ResultRow[]> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) { console.error('LOVABLE_API_KEY not configured'); return []; }

  const prompt = `Analyse ce contenu markdown d'une page de résultats immobiliers du site "${sourceName}" et extrais TOUTES les annonces de location trouvées.

Pour chaque annonce, extrais:
- title: titre de l'annonce
- address: adresse complète si disponible
- city: ville
- postal_code: code postal
- canton: canton suisse (2 lettres)
- rent_amount: loyer net mensuel (nombre)
- charges_amount: charges mensuelles (nombre)
- total_amount: loyer total charges comprises (nombre)
- number_of_rooms: nombre de pièces (nombre décimal, ex: 3.5)
- living_area: surface habitable en m² (nombre)
- availability_date: date de disponibilité (format YYYY-MM-DD)
- description: brève description
- external_listing_id: identifiant unique de l'annonce sur le site (numéro de référence, ID dans l'URL, etc.)
- source_url: URL directe vers l'annonce si trouvée dans le contenu
- contact_name: nom de l'agence ou du contact
- contact_phone: téléphone
- contact_email: email

Si une information n'est pas disponible, mets null.
Extrais uniquement des annonces réelles, pas des publicités ou suggestions.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert en extraction de données immobilières. Tu retournes uniquement des données structurées via tool calling.' },
          { role: 'user', content: `${prompt}\n\n---\n\n${markdown.substring(0, 30000)}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_listings',
            description: 'Extraire les annonces immobilières structurées depuis le contenu de la page',
            parameters: {
              type: 'object',
              properties: {
                listings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      address: { type: 'string', nullable: true },
                      city: { type: 'string', nullable: true },
                      postal_code: { type: 'string', nullable: true },
                      canton: { type: 'string', nullable: true },
                      rent_amount: { type: 'number', nullable: true },
                      charges_amount: { type: 'number', nullable: true },
                      total_amount: { type: 'number', nullable: true },
                      number_of_rooms: { type: 'number', nullable: true },
                      living_area: { type: 'number', nullable: true },
                      availability_date: { type: 'string', nullable: true },
                      description: { type: 'string', nullable: true },
                      external_listing_id: { type: 'string', nullable: true },
                      source_url: { type: 'string', nullable: true },
                      contact_name: { type: 'string', nullable: true },
                      contact_phone: { type: 'string', nullable: true },
                      contact_email: { type: 'string', nullable: true },
                    },
                    required: ['title'],
                  },
                },
              },
              required: ['listings'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_listings' } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`AI extraction failed [${response.status}]:`, errText);
      return [];
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return [];

    const parsed = JSON.parse(toolCall.function.arguments);
    const listings: ResultRow[] = (parsed.listings || []).map((l: Record<string, unknown>) => ({
      source_name: sourceName,
      source_url: (l.source_url as string) || sourceUrl,
      external_listing_id: (l.external_listing_id as string) || null,
      title: l.title as string,
      address: (l.address as string) || null,
      postal_code: (l.postal_code as string) || null,
      city: (l.city as string) || null,
      canton: (l.canton as string) || null,
      rent_amount: (l.rent_amount as number) || null,
      charges_amount: (l.charges_amount as number) || null,
      total_amount: (l.total_amount as number) || null,
      number_of_rooms: (l.number_of_rooms as number) || null,
      living_area: (l.living_area as number) || null,
      availability_date: (l.availability_date as string) || null,
      description: (l.description as string) || null,
      contact_name: (l.contact_name as string) || null,
      contact_email: (l.contact_email as string) || null,
      contact_phone: (l.contact_phone as string) || null,
      extraction_timestamp: new Date().toISOString(),
    }));

    return listings;
  } catch (err) {
    console.error('AI extraction exception:', err);
    return [];
  }
}

async function runAutonomousSearch(
  adminClient: SupabaseClient,
  aiAgentId: string,
  missionId: string,
  clientId: string,
  runId: string,
  criteria: Record<string, unknown>,
  allowedSources?: string[] | null,
  overrides?: { city?: string; budget?: number; rooms?: number },
): Promise<{ totalInserted: number; totalDuplicates: number; totalFailed: number; sourcesUsed: string[] }> {
  const city = overrides?.city || (criteria.city as string) || (criteria.region_recherche as string) || 'Genève';
  const rooms = overrides?.rooms || (criteria.rooms as number) || null;
  const budget = overrides?.budget || (criteria.budget_max as number) || null;
  const typeBien = (criteria.type_bien as string) || null;

  // Filter portals by allowed_sources
  let portalsToUse = SEARCH_PORTALS;
  if (allowedSources && allowedSources.length > 0) {
    const resolvedNames = allowedSources.map(s => SOURCE_ALIASES[s.toLowerCase()] || s.toLowerCase());
    portalsToUse = SEARCH_PORTALS.filter(p => resolvedNames.includes(p.name));
    if (portalsToUse.length === 0) {
      console.warn('No matching portals for allowed_sources:', allowedSources, '→ using all portals');
      portalsToUse = SEARCH_PORTALS;
    }
  }

  console.log(`Search params: city=${city}, rooms=${rooms}, budget=${budget}, portals=${portalsToUse.map(p => p.name).join(',')}`);

  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalFailed = 0;
  const sourcesUsed: string[] = [];

  for (const portal of portalsToUse) {
    try {
      const url = portal.buildUrl(city, rooms, budget, typeBien);
      console.log(`[${portal.name}] Scraping: ${url}`);

      const markdown = await scrapeUrl(url);
      if (!markdown) {
        console.warn(`[${portal.name}] No content returned`);
        continue;
      }

      console.log(`[${portal.name}] Got ${markdown.length} chars, extracting listings...`);
      const listings = await extractListingsWithAI(markdown, portal.name, url);
      console.log(`[${portal.name}] Extracted ${listings.length} listings`);

      if (listings.length === 0) continue;

      sourcesUsed.push(portal.name);
      const result = await ingestResults(adminClient, {
        mission_id: missionId,
        client_id: clientId,
        ai_agent_id: aiAgentId,
        results: listings,
        criteria,
      });

      totalInserted += result.inserted;
      totalDuplicates += result.duplicates;
      totalFailed += result.failed;

      console.log(`[${portal.name}] Ingested: ${result.inserted} new, ${result.duplicates} dupes, ${result.failed} failed`);
    } catch (err) {
      console.error(`[${portal.name}] Error:`, err);
      totalFailed++;
    }
  }

  // Update run with results
  await adminClient
    .from('mission_execution_runs')
    .update({
      status: sourcesUsed.length > 0 ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      results_found: totalInserted + totalDuplicates,
      results_new: totalInserted,
      duplicates_detected: totalDuplicates,
      sources_used: sourcesUsed,
    })
    .eq('id', runId);

  // Update mission counters
  const { data: currentMission } = await adminClient
    .from('search_missions')
    .select('results_found, results_retained')
    .eq('id', missionId)
    .single();

  if (currentMission) {
    await adminClient
      .from('search_missions')
      .update({
        results_found: (currentMission.results_found ?? 0) + totalInserted + totalDuplicates,
        results_retained: (currentMission.results_retained ?? 0) + totalInserted,
      })
      .eq('id', missionId);
  }

  return { totalInserted, totalDuplicates, totalFailed, sourcesUsed };
}

// === END SCRAPING ENGINE ===

async function handleMissionsRun(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  missionId: string,
  req: Request,
) {
  // Validate mission is active and belongs to this agent
  const { data: mission } = await adminClient
    .from('search_missions')
    .select('id, client_id, status, criteria_snapshot, allowed_sources')
    .eq('id', missionId)
    .eq('ai_agent_id', aiAgent.id)
    .single();

  if (!mission) return errorResponse('Mission not found', 404);
  if (mission.status !== 'active') return errorResponse('Mission is not active', 400);

  const body = await req.json().catch(() => ({}));

  // Create execution run
  const { data: run, error } = await adminClient
    .from('mission_execution_runs')
    .insert({
      mission_id: missionId,
      status: 'running',
      started_at: new Date().toISOString(),
      sources_used: body.sources_used ?? [],
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  // Update mission last_run_at
  await adminClient
    .from('search_missions')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', missionId);

  await logActivity(adminClient, aiAgent.id as string, {
    action_type: 'mission_run_started',
    client_id: mission.client_id,
    mission_id: missionId,
    metadata: { run_id: run.id },
  });

  // Build criteria (use snapshot or fetch fresh)
  const criteria = (mission.criteria_snapshot as Record<string, unknown>) || await buildCriteriaSnapshot(adminClient, mission.client_id);

  // Body overrides for testing
  const overrides = {
    city: body.city as string | undefined,
    budget: body.budget as number | undefined,
    rooms: body.rooms as number | undefined,
  };

  // Launch autonomous search (runs inline, edge function has 150s timeout)
  try {
    const searchResult = await runAutonomousSearch(
      adminClient,
      aiAgent.id as string,
      missionId,
      mission.client_id,
      run.id,
      criteria,
      mission.allowed_sources as string[] | null,
      overrides,
    );

    await logActivity(adminClient, aiAgent.id as string, {
      action_type: 'mission_run_completed',
      client_id: mission.client_id,
      mission_id: missionId,
      metadata: {
        run_id: run.id,
        ...searchResult,
      },
    });

    return jsonResponse({
      data: {
        run_id: run.id,
        status: searchResult.sourcesUsed.length > 0 ? 'completed' : 'failed',
        ...searchResult,
      },
    });
  } catch (err) {
    console.error('Autonomous search failed:', err);

    await adminClient
      .from('mission_execution_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', run.id);

    return jsonResponse({
      data: {
        run_id: run.id,
        status: 'failed',
        error: String(err),
      },
    });
  }
}

async function handleResultsBatch(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  req: Request,
) {
  const body = await req.json();
  const { mission_id, run_id, client_id, results } = body;

  if (!mission_id || !client_id || !Array.isArray(results)) {
    return errorResponse('mission_id, client_id, and results[] required', 400);
  }

  // Verify mission belongs to this agent
  const { data: mission } = await adminClient
    .from('search_missions')
    .select('id, criteria_snapshot')
    .eq('id', mission_id)
    .eq('ai_agent_id', aiAgent.id)
    .single();

  if (!mission) return errorResponse('Mission not found', 404);

  const ingestionResult = await ingestResults(adminClient, {
    mission_id,
    client_id,
    ai_agent_id: aiAgent.id as string,
    results,
    criteria: mission.criteria_snapshot as Record<string, unknown> | null,
  });

  // Update run counters if run_id provided
  if (run_id) {
    await adminClient
      .from('mission_execution_runs')
      .update({
        results_found: ingestionResult.inserted + ingestionResult.duplicates,
        results_new: ingestionResult.inserted,
        duplicates_detected: ingestionResult.duplicates,
      })
      .eq('id', run_id);
  }

  // Update mission counters
  // Use raw increment approach: fetch current + add
  const { data: currentMission } = await adminClient
    .from('search_missions')
    .select('results_found, results_retained')
    .eq('id', mission_id)
    .single();

  if (currentMission) {
    await adminClient
      .from('search_missions')
      .update({
        results_found: (currentMission.results_found ?? 0) + ingestionResult.inserted + ingestionResult.duplicates,
        results_retained: (currentMission.results_retained ?? 0) + ingestionResult.inserted,
      })
      .eq('id', mission_id);
  }

  await logActivity(adminClient, aiAgent.id as string, {
    action_type: 'results_ingested',
    client_id,
    mission_id,
    metadata: {
      inserted: ingestionResult.inserted,
      duplicates: ingestionResult.duplicates,
      failed: ingestionResult.failed,
    },
  });

  return jsonResponse({ data: ingestionResult });
}

async function handleOffersPrepare(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  req: Request,
) {
  const body = await req.json();
  const { client_id, property_result_ids, message_template, channel } = body;

  if (!client_id || !Array.isArray(property_result_ids) || property_result_ids.length === 0) {
    return errorResponse('client_id and property_result_ids[] required', 400);
  }

  // Check assignment and approval settings
  const { data: assignment } = await adminClient
    .from('ai_agent_assignments')
    .select('id, approval_required_for_offers')
    .eq('ai_agent_id', aiAgent.id)
    .eq('client_id', client_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!assignment) return errorResponse('Client not assigned to this agent', 403);

  const needsApproval = assignment.approval_required_for_offers === true;
  const status = needsApproval ? 'en_attente_validation' : 'brouillon';

  const insertedMessages: unknown[] = [];

  for (const propertyResultId of property_result_ids) {
    const { data: msg, error } = await adminClient
      .from('client_offer_messages')
      .insert({
        client_id,
        property_result_id: propertyResultId,
        ai_agent_id: aiAgent.id,
        message_body: message_template ?? '',
        channel: channel ?? 'email',
        status,
      })
      .select()
      .single();

    if (error) {
      console.error(`Failed to create offer message for ${propertyResultId}:`, error);
      continue;
    }

    insertedMessages.push(msg);

    // Create approval request if needed
    if (needsApproval && msg) {
      try {
        await adminClient.rpc('create_approval_request', {
          p_request_type: 'offer',
          p_reference_table: 'client_offer_messages',
          p_reference_id: msg.id,
          p_title: `Offre pour propriété ${propertyResultId}`,
          p_description: message_template ?? '',
          p_ai_agent_id: aiAgent.id,
          p_client_id: client_id,
        });
      } catch (approvalErr) {
        console.error('Approval request creation failed:', approvalErr);
      }
    }
  }

  await logActivity(adminClient, aiAgent.id as string, {
    action_type: 'offers_prepared',
    client_id,
    metadata: {
      count: insertedMessages.length,
      needs_approval: needsApproval,
      property_result_ids,
    },
  });

  return jsonResponse({ data: { messages: insertedMessages, status, needs_approval: needsApproval } });
}

async function handleVisitsRequest(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  req: Request,
) {
  const body = await req.json();
  const { client_id, property_result_id, preferred_dates, notes } = body;

  if (!client_id || !property_result_id) {
    return errorResponse('client_id and property_result_id required', 400);
  }

  // Check assignment
  const { data: assignment } = await adminClient
    .from('ai_agent_assignments')
    .select('id, approval_required_for_visits')
    .eq('ai_agent_id', aiAgent.id)
    .eq('client_id', client_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!assignment) return errorResponse('Client not assigned to this agent', 403);

  const needsApproval = assignment.approval_required_for_visits === true;

  const { data: visitReq, error } = await adminClient
    .from('visit_requests')
    .insert({
      client_id,
      property_result_id,
      ai_agent_id: aiAgent.id,
      status: 'non_traite',
      approval_required: needsApproval,
      preferred_dates: preferred_dates ?? [],
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  if (needsApproval && visitReq) {
    try {
      await adminClient.rpc('create_approval_request', {
        p_request_type: 'visit',
        p_reference_table: 'visit_requests',
        p_reference_id: visitReq.id,
        p_title: `Demande de visite pour propriété ${property_result_id}`,
        p_description: notes ?? '',
        p_ai_agent_id: aiAgent.id,
        p_client_id: client_id,
      });
    } catch (approvalErr) {
      console.error('Approval request creation failed:', approvalErr);
    }
  }

  await logActivity(adminClient, aiAgent.id as string, {
    action_type: 'visit_requested',
    client_id,
    metadata: {
      visit_request_id: visitReq?.id,
      property_result_id,
      needs_approval: needsApproval,
    },
  });

  return jsonResponse({ data: visitReq });
}

async function handleClientCriteria(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  clientId: string,
) {
  // Verify assignment
  const { data: assignment } = await adminClient
    .from('ai_agent_assignments')
    .select('id')
    .eq('ai_agent_id', aiAgent.id)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle();

  if (!assignment) return errorResponse('Client not assigned to this agent', 403);

  const criteria = await buildCriteriaSnapshot(adminClient, clientId);
  return jsonResponse({ data: criteria });
}

async function handleLog(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  req: Request,
) {
  const body = await req.json();
  const { action_type, client_id, mission_id, property_result_id, metadata, content_generated, connector_used } = body;

  if (!action_type) return errorResponse('action_type required', 400);

  await logActivity(adminClient, aiAgent.id as string, {
    action_type,
    client_id,
    mission_id,
    property_result_id,
    metadata,
    content_generated,
    connector_used,
  });

  return jsonResponse({ data: { logged: true } });
}

// === HELPERS ===

async function logActivity(
  adminClient: ReturnType<typeof createClient>,
  aiAgentId: string,
  params: {
    action_type: string;
    client_id?: string;
    mission_id?: string;
    property_result_id?: string;
    metadata?: Record<string, unknown>;
    content_generated?: string;
    connector_used?: string;
  },
) {
  try {
    await adminClient.rpc('log_ai_activity', {
      p_ai_agent_id: aiAgentId,
      p_action_type: params.action_type,
      p_client_id: params.client_id ?? null,
      p_mission_id: params.mission_id ?? null,
      p_property_result_id: params.property_result_id ?? null,
      p_metadata: params.metadata ?? {},
      p_content_generated: params.content_generated ?? null,
      p_connector_used: params.connector_used ?? null,
    });
  } catch (err) {
    console.error('log_ai_activity failed:', err);
  }
}
