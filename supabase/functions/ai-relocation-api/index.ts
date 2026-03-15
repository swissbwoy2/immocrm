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

function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

function normalizePositiveNumber(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  const n = parseFloat(String(val));
  return (!isNaN(n) && n >= 0) ? n : undefined;
}

function capitalizeFirst(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function normalizeResultRow(row: ResultRow): ResultRow {
  return {
    ...row,
    title: row.title?.trim().replace(/\s+/g, ' '),
    address: row.address?.trim(),
    city: row.city ? capitalizeFirst(row.city) : row.city,
    postal_code: row.postal_code ? row.postal_code.trim().replace(/[^\d]/g, '') || undefined : row.postal_code,
    canton: row.canton?.trim(),
    rent_amount: normalizePositiveNumber(row.rent_amount),
    charges_amount: normalizePositiveNumber(row.charges_amount),
    total_amount: normalizePositiveNumber(row.total_amount),
    number_of_rooms: normalizePositiveNumber(row.number_of_rooms),
    living_area: normalizePositiveNumber(row.living_area),
    contact_email: row.contact_email?.trim().toLowerCase(),
    contact_phone: row.contact_phone?.trim(),
    contact_name: row.contact_name?.trim(),
    external_listing_id: row.external_listing_id?.trim(),
    source_url: (row.source_url?.trim() && isValidUrl(row.source_url.trim())) ? row.source_url.trim() : undefined,
    visit_booking_link: (row.visit_booking_link?.trim() && isValidUrl(row.visit_booking_link.trim())) ? row.visit_booking_link.trim() : undefined,
  };
}

async function ingestResults(adminClient: SupabaseClient, params: IngestParams): Promise<IngestResult> {
  const { mission_id, client_id, ai_agent_id, results, criteria } = params;
  const out: IngestResult = { inserted: 0, duplicates: 0, failed: 0, ids: [], errors: [] };
  for (const rawRow of results) {
    const row = normalizeResultRow(rawRow);
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // === SCHEDULER INTERNAL AUTH PATH ===
    // The scheduler sends only x-scheduler-secret (no Bearer token).
    // This path creates its own service role client and only allows /missions/:id/run.
    const schedulerSecret = req.headers.get('x-scheduler-secret');
    if (schedulerSecret) {
      const expectedSecret = Deno.env.get('AI_RELOCATION_WEBHOOK_SECRET');
      if (!expectedSecret || schedulerSecret !== expectedSecret) {
        return errorResponse('Invalid scheduler secret', 401);
      }

      console.log('[ai-relocation-api] Scheduler internal auth path');
      const adminClient = createClient(supabaseUrl, serviceKey);

      const url = new URL(req.url);
      const path = url.pathname.replace(/^\/ai-relocation-api\/?/, '/');
      const runMatch = path.match(/^\/missions\/([^/]+)\/run$/);

      if (!runMatch || req.method !== 'POST') {
        return errorResponse('Scheduler can only call POST /missions/:id/run', 403);
      }

      const missionId = runMatch[1];

      // Look up mission to get ai_agent_id
      const { data: mission, error: missionErr } = await adminClient
        .from('search_missions')
        .select('ai_agent_id')
        .eq('id', missionId)
        .single();
      if (missionErr || !mission) {
        return errorResponse('Mission not found', 404);
      }

      // Fetch the AI agent record
      const { data: aiAgent } = await adminClient
        .from('ai_agents')
        .select('*')
        .eq('id', mission.ai_agent_id)
        .single();
      if (!aiAgent) {
        return errorResponse('AI agent not found', 404);
      }

      return await handleMissionsRun(adminClient, aiAgent, missionId, req);
    }

    // === STANDARD USER AUTH ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    console.log('[ai-relocation-api] Authenticating user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('[ai-relocation-api] Auth failed:', userError?.message);
      return errorResponse('Invalid token', 401);
    }
    console.log('[ai-relocation-api] Authenticated as', user.email);
    const userId = user.id;

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
      const { data } = await adminClient
        .from('ai_agents')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single();
      aiAgent = data;
    } else {
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

    // POST /offers/:id/send
    const offerSendMatch = path.match(/^\/offers\/([^/]+)\/send$/);
    if (req.method === 'POST' && offerSendMatch) {
      return await handleOfferSend(adminClient, aiAgent, offerSendMatch[1], authHeader, req);
    }

    // POST /approvals/:id/approve
    const approveMatch = path.match(/^\/approvals\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approveMatch) {
      return await handleApprovalDecision(adminClient, userId, approveMatch[1], 'approved', req);
    }

    // POST /approvals/:id/reject
    const rejectMatch = path.match(/^\/approvals\/([^/]+)\/reject$/);
    if (req.method === 'POST' && rejectMatch) {
      return await handleApprovalDecision(adminClient, userId, rejectMatch[1], 'rejected', req);
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

  // Set next_run_at based on frequency for scheduling
  if (mappedFrequency === 'quotidien') {
    await adminClient.from('search_missions')
      .update({ next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', mission.id);
  } else if (mappedFrequency === 'hebdomadaire') {
    await adminClient.from('search_missions')
      .update({ next_run_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', mission.id);
  }
  // manuel → next_run_at stays null (default)

  await logActivity(adminClient, aiAgent.id as string, {
    action_type: 'mission_created',
    client_id,
    metadata: { mission_id: mission.id, next_run_at: mappedFrequency !== 'manuel' ? 'set' : null },
  });

  return jsonResponse({ data: mission });
}

// === SCRAPING & AI EXTRACTION ENGINE ===

// --- Error classification ---
type ErrorType = 'timeout' | 'network' | 'source_invalid' | 'scraper_error'
  | 'ai_extraction_error' | 'empty_result' | 'rate_limited' | 'unknown';

function classifyError(err: unknown, httpStatus?: number): { type: ErrorType; message: string; retryable: boolean } {
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof DOMException && err.name === 'AbortError') return { type: 'timeout', message: 'Request timed out', retryable: true };
  if (err instanceof TypeError && msg.includes('fetch')) return { type: 'network', message: msg, retryable: true };
  if (httpStatus === 429) return { type: 'rate_limited', message: 'Rate limited (429)', retryable: true };
  if (httpStatus && httpStatus >= 500) return { type: 'scraper_error', message: `Server error (${httpStatus})`, retryable: true };
  if (httpStatus && httpStatus >= 400) return { type: 'scraper_error', message: `Client error (${httpStatus})`, retryable: false };
  return { type: 'unknown', message: msg, retryable: false };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidUrl(urlStr: string): boolean {
  try { new URL(urlStr); return true; } catch { return false; }
}

// --- Types ---
interface ScrapeResult {
  markdown: string | null;
  status: number;
  error_type?: ErrorType;
  error_message?: string;
}

interface ExtractionResult {
  listings: ResultRow[];
  error_type?: ErrorType;
  error_message?: string;
}

interface SourceExecMeta {
  name: string;
  url: string;
  status: 'success' | 'failed' | 'empty';
  error_type?: ErrorType;
  error_message?: string;
  listings_count: number;
  duration_ms: number;
  retried: boolean;
}

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

const SCRAPE_TIMEOUT_MS = 30_000;
const AI_EXTRACTION_TIMEOUT_MS = 60_000;
const INTER_SOURCE_DELAY_MS = 1_500;
const MAX_MARKDOWN_CHARS = 30_000;

async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return { markdown: null, status: 0, error_type: 'scraper_error', error_message: 'FIRECRAWL_API_KEY not configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

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
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const classified = classifyError(new Error(errData?.error || `HTTP ${response.status}`), response.status);
      return { markdown: null, status: response.status, error_type: classified.type, error_message: classified.message };
    }

    const data = await response.json();
    const markdown = data?.data?.markdown || data?.markdown || null;
    return { markdown, status: response.status };
  } catch (err) {
    clearTimeout(timer);
    const classified = classifyError(err);
    return { markdown: null, status: 0, error_type: classified.type, error_message: classified.message };
  }
}

async function extractListingsWithAI(markdown: string, sourceName: string, sourceUrl: string): Promise<ExtractionResult> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    return { listings: [], error_type: 'ai_extraction_error', error_message: 'LOVABLE_API_KEY not configured' };
  }

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_EXTRACTION_TIMEOUT_MS);

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
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      return { listings: [], error_type: 'ai_extraction_error', error_message: `AI API error [${response.status}]: ${errText.substring(0, 200)}` };
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return { listings: [], error_type: 'ai_extraction_error', error_message: 'No tool call in AI response' };
    }

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

    return { listings };
  } catch (err) {
    clearTimeout(timer);
    const classified = classifyError(err);
    return { listings: [], error_type: classified.type, error_message: classified.message };
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
  const city = overrides?.city || (criteria.city as string) || (criteria.location as string) || (criteria.region_recherche as string) || 'Genève';
  const rooms = overrides?.rooms || (criteria.rooms as number) || (criteria.min_rooms as number) || null;
  const budget = overrides?.budget || (criteria.budget_max as number) || null;
  const typeBien = (criteria.type_bien as string) || (criteria.property_type as string) || null;

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
  const sourcesMeta: SourceExecMeta[] = [];

  for (let i = 0; i < portalsToUse.length; i++) {
    const portal = portalsToUse[i];

    // Inter-source throttling (skip before first)
    if (i > 0) {
      await delay(INTER_SOURCE_DELAY_MS);
    }

    const startTime = Date.now();
    const meta: SourceExecMeta = {
      name: portal.name,
      url: '',
      status: 'failed',
      listings_count: 0,
      duration_ms: 0,
      retried: false,
    };

    try {
      const url = portal.buildUrl(city, rooms, budget, typeBien);
      meta.url = url;

      // A3: URL validation
      if (!isValidUrl(url)) {
        meta.error_type = 'source_invalid';
        meta.error_message = `Malformed URL: ${url}`;
        meta.duration_ms = Date.now() - startTime;
        sourcesMeta.push(meta);
        console.warn(`[${portal.name}] Invalid URL: ${url}`);
        continue;
      }

      console.log(`[${portal.name}] Scraping: ${url}`);

      // Scrape with possible retry
      let scrapeResult = await scrapeUrl(url);

      // Retry once if transient
      if (scrapeResult.error_type && classifyError(new Error(scrapeResult.error_message || ''), scrapeResult.status).retryable) {
        console.log(`[${portal.name}] Retrying after transient error: ${scrapeResult.error_type}`);
        meta.retried = true;
        await delay(2000);
        scrapeResult = await scrapeUrl(url);
      }

      if (scrapeResult.error_type || !scrapeResult.markdown) {
        meta.error_type = scrapeResult.error_type || 'empty_result';
        meta.error_message = scrapeResult.error_message || 'No content returned';
        meta.duration_ms = Date.now() - startTime;
        sourcesMeta.push(meta);
        console.warn(`[${portal.name}] Scrape failed: ${meta.error_type} - ${meta.error_message}`);
        continue;
      }

      console.log(`[${portal.name}] Got ${scrapeResult.markdown.length} chars, extracting listings...`);

      // AI extraction with possible retry
      let extraction = await extractListingsWithAI(scrapeResult.markdown, portal.name, url);

      if (extraction.error_type && classifyError(new Error(extraction.error_message || '')).retryable) {
        console.log(`[${portal.name}] Retrying AI extraction after: ${extraction.error_type}`);
        meta.retried = true;
        await delay(2000);
        extraction = await extractListingsWithAI(scrapeResult.markdown, portal.name, url);
      }

      if (extraction.error_type) {
        meta.error_type = extraction.error_type;
        meta.error_message = extraction.error_message;
        meta.duration_ms = Date.now() - startTime;
        sourcesMeta.push(meta);
        console.warn(`[${portal.name}] Extraction failed: ${meta.error_type}`);
        continue;
      }

      if (extraction.listings.length === 0) {
        meta.status = 'empty';
        meta.error_type = 'empty_result';
        meta.error_message = 'No listings extracted';
        meta.duration_ms = Date.now() - startTime;
        sourcesMeta.push(meta);
        console.log(`[${portal.name}] No listings extracted`);
        continue;
      }

      console.log(`[${portal.name}] Extracted ${extraction.listings.length} listings`);

      sourcesUsed.push(portal.name);
      const result = await ingestResults(adminClient, {
        mission_id: missionId,
        client_id: clientId,
        ai_agent_id: aiAgentId,
        results: extraction.listings,
        criteria,
      });

      totalInserted += result.inserted;
      totalDuplicates += result.duplicates;
      totalFailed += result.failed;

      meta.status = 'success';
      meta.listings_count = extraction.listings.length;
      meta.duration_ms = Date.now() - startTime;
      sourcesMeta.push(meta);

      console.log(`[${portal.name}] Ingested: ${result.inserted} new, ${result.duplicates} dupes, ${result.failed} failed`);
    } catch (err) {
      const classified = classifyError(err);
      meta.error_type = classified.type;
      meta.error_message = classified.message;
      meta.duration_ms = Date.now() - startTime;
      sourcesMeta.push(meta);
      console.error(`[${portal.name}] Error:`, err);
      totalFailed++;
    }
  }

  // Build structured execution metadata
  const executionMetadata = {
    sources: sourcesMeta,
    totals: {
      sources_attempted: portalsToUse.length,
      sources_succeeded: sourcesMeta.filter(s => s.status === 'success').length,
      sources_failed: sourcesMeta.filter(s => s.status === 'failed').length,
      sources_empty: sourcesMeta.filter(s => s.status === 'empty').length,
      raw_listings_found: sourcesMeta.reduce((sum, s) => sum + s.listings_count, 0),
      inserted_results: totalInserted,
      duplicates: totalDuplicates,
      failed_results: totalFailed,
    },
  };

  // Update run with results + metadata
  await adminClient
    .from('mission_execution_runs')
    .update({
      status: sourcesUsed.length > 0 ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      results_found: totalInserted + totalDuplicates,
      results_new: totalInserted,
      duplicates_detected: totalDuplicates,
      sources_searched: sourcesUsed,
      execution_metadata: executionMetadata,
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
      sources_searched: body.sources_searched ?? body.sources_used ?? [],
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
      .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: String(err) })
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
  const { client_id, property_result_id, preferred_dates, proposed_slots, notes, contact_message } = body;

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
      proposed_slots: proposed_slots ?? preferred_dates ?? [],
      contact_message: contact_message ?? notes ?? null,
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

// === OFFER SEND HANDLER ===

async function handleOfferSend(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  offerId: string,
  callerAuthHeader: string,
  req: Request,
) {
  // 1. Fetch offer
  const { data: offer, error: offerErr } = await adminClient
    .from('client_offer_messages')
    .select('*')
    .eq('id', offerId)
    .single();

  if (offerErr || !offer) return errorResponse('Offer not found', 404);
  if (offer.ai_agent_id !== aiAgent.id) return errorResponse('Offer does not belong to this agent', 403);
  if (offer.status !== 'pret') return errorResponse('Offer must be in "pret" status to send', 400);

  // 2. Parse body
  const body = await req.json().catch(() => ({}));
  const selectedPropertyIds: string[] | undefined = body.selected_property_ids;
  const customMessage: string | undefined = body.custom_message;

  // 3. Fetch client email
  const { data: client } = await adminClient
    .from('clients')
    .select('id, user_id, profiles:user_id(prenom, nom, email)')
    .eq('id', offer.client_id)
    .single();

  const clientProfile = (client as any)?.profiles;
  const clientEmail = clientProfile?.email;
  const clientName = [clientProfile?.prenom, clientProfile?.nom].filter(Boolean).join(' ') || 'Client';

  if (!clientEmail) return errorResponse('Client email not found', 400);

  // 4. Fetch properties
  const allPropertyIds: string[] = Array.isArray(offer.property_result_ids) ? offer.property_result_ids : [];
  let propertyIdsToSend: string[];

  if (selectedPropertyIds && selectedPropertyIds.length > 0) {
    // Validated subset: only IDs that exist in the offer's property_result_ids
    propertyIdsToSend = selectedPropertyIds.filter(id => allPropertyIds.includes(id));
    if (propertyIdsToSend.length === 0) {
      return errorResponse('None of the selected property IDs match the offer', 400);
    }
  } else {
    propertyIdsToSend = allPropertyIds;
  }

  let properties: any[] = [];
  if (propertyIdsToSend.length > 0) {
    const { data: props } = await adminClient
      .from('property_results')
      .select('id, title, address, rent_amount, living_area, number_of_rooms, source_name')
      .in('id', propertyIdsToSend);
    properties = props ?? [];
  }

  // 5. Build HTML email
  const messageText = customMessage || (offer as any).message_body || '';

  const propertiesHtml = properties.map((p: any) => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
      <h3 style="margin:0 0 8px;color:#1f2937;">${p.title || 'Bien immobilier'}</h3>
      ${p.address ? `<p style="margin:4px 0;color:#6b7280;">📍 ${p.address}</p>` : ''}
      <div style="display:flex;gap:16px;margin-top:8px;">
        ${p.rent_amount ? `<span style="font-weight:600;color:#059669;">CHF ${Number(p.rent_amount).toLocaleString()}</span>` : ''}
        ${p.living_area ? `<span style="color:#6b7280;">${p.living_area} m²</span>` : ''}
        ${p.number_of_rooms ? `<span style="color:#6b7280;">${p.number_of_rooms} pièces</span>` : ''}
      </div>
      ${p.source_name ? `<p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Source: ${p.source_name}</p>` : ''}
    </div>
  `).join('');

  const emailBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1f2937;">Bonjour ${clientName},</h2>
      <p style="color:#4b5563;">Nous avons trouvé des biens correspondant à vos critères de recherche :</p>
      ${messageText ? `<p style="color:#4b5563;background:#f3f4f6;padding:12px;border-radius:6px;">${messageText}</p>` : ''}
      ${propertiesHtml}
      <p style="color:#4b5563;margin-top:24px;">N'hésitez pas à nous contacter pour organiser des visites.</p>
      <p style="color:#6b7280;">Cordialement,<br/>L'équipe Logisorama</p>
    </div>
  `;

  // 6. Call send-smtp-email with caller's JWT
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  try {
    const smtpResponse = await fetch(`${supabaseUrl}/functions/v1/send-smtp-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': callerAuthHeader,
      },
      body: JSON.stringify({
        recipient_email: clientEmail,
        recipient_name: clientName,
        subject: 'Nouvelles offres immobilières pour vous',
        body_html: emailBody,
      }),
    });

    const smtpResult = await smtpResponse.json();

    if (!smtpResponse.ok || !smtpResult.success) {
      // 7b. On failure
      await adminClient
        .from('client_offer_messages')
        .update({ status: 'erreur' as any, error_message: smtpResult.error || 'Email sending failed' })
        .eq('id', offerId);

      await logActivity(adminClient, aiAgent.id as string, {
        action_type: 'offer_send_failed',
        client_id: offer.client_id,
        metadata: { offer_id: offerId, error: smtpResult.error },
      });

      return errorResponse(smtpResult.error || 'Email sending failed', 502);
    }

    // 7a. On success
    await adminClient
      .from('client_offer_messages')
      .update({ status: 'envoye' as any, sent_at: new Date().toISOString() })
      .eq('id', offerId);

    // Update only validated subset of property_results
    if (propertyIdsToSend.length > 0) {
      await adminClient
        .from('property_results')
        .update({ result_status: 'envoye_au_client' })
        .in('id', propertyIdsToSend);
    }

    // Create client notification
    if ((client as any)?.user_id) {
      await adminClient.from('notifications').insert({
        user_id: (client as any).user_id,
        type: 'new_offer',
        title: '🏠 Nouvelles offres disponibles',
        message: `${properties.length} bien(s) correspondant à vos critères vous ont été envoyés.`,
        link: '/client/offres-recues',
      });
    }

    await logActivity(adminClient, aiAgent.id as string, {
      action_type: 'offer_sent',
      client_id: offer.client_id,
      metadata: { offer_id: offerId, properties_sent: propertyIdsToSend.length },
    });

    return jsonResponse({ success: true, properties_sent: propertyIdsToSend.length });
  } catch (err) {
    await adminClient
      .from('client_offer_messages')
      .update({ status: 'erreur' as any, error_message: String(err) })
      .eq('id', offerId);

    await logActivity(adminClient, aiAgent.id as string, {
      action_type: 'offer_send_failed',
      client_id: offer.client_id,
      metadata: { offer_id: offerId, error: String(err) },
    });

    return errorResponse('Email sending failed: ' + String(err), 502);
  }
}

// === APPROVAL DECISION HANDLER ===

async function handleApprovalDecision(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  approvalId: string,
  decision: 'approved' | 'rejected',
  req: Request,
) {
  const body = await req.json().catch(() => ({}));
  const notes: string = body.notes || '';

  // 1. Fetch approval
  const { data: approval, error: approvalErr } = await adminClient
    .from('approval_requests')
    .select('*')
    .eq('id', approvalId)
    .single();

  if (approvalErr || !approval) return errorResponse('Approval request not found', 404);
  if (approval.status !== 'pending') return errorResponse('Approval is not pending', 400);

  // 2. Update approval
  const { error: updateErr } = await adminClient
    .from('approval_requests')
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: userId,
      decision_notes: notes || null,
    })
    .eq('id', approvalId);

  if (updateErr) return errorResponse(updateErr.message, 500);

  // 3. Cascade based on reference_table
  if (approval.reference_table && approval.reference_id) {
    try {
      if (approval.reference_table === 'client_offer_messages') {
        const newStatus = decision === 'approved' ? 'pret' : 'refuse';
        await adminClient
          .from('client_offer_messages')
          .update({ status: newStatus as any })
          .eq('id', approval.reference_id);
      } else if (approval.reference_table === 'visit_requests') {
        const newStatus = decision === 'approved' ? 'demande_prete' : 'visite_refusee';
        await adminClient
          .from('visit_requests')
          .update({ status: newStatus as any })
          .eq('id', approval.reference_id);
      }
    } catch (cascadeErr) {
      console.error('Cascade update error:', cascadeErr);
    }
  }

  // 4. Log activity
  await logActivity(adminClient, approval.ai_agent_id as string, {
    action_type: decision === 'approved' ? 'approval_approved' : 'approval_rejected',
    client_id: approval.client_id as string,
    metadata: { approval_id: approvalId, reference_table: approval.reference_table, reference_id: approval.reference_id },
  });

  return jsonResponse({ success: true, decision });
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
