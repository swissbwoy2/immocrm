import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// === SHARED: Result Ingestion ===

interface ResultRow {
  source_name?: string; source_url?: string; external_listing_id?: string; title?: string;
  address?: string; postal_code?: string; city?: string; canton?: string;
  rent_amount?: number; charges_amount?: number; total_amount?: number;
  number_of_rooms?: number; living_area?: number; availability_date?: string;
  description?: string; images?: unknown[]; contact_name?: string; contact_email?: string;
  contact_phone?: string; visit_booking_link?: string; application_channel?: string;
  extraction_timestamp?: string;
}

interface IngestParams {
  mission_id: string; client_id: string; ai_agent_id: string;
  results: ResultRow[]; criteria?: Record<string, unknown> | null;
}

interface IngestResult { inserted: number; duplicates: number; failed: number; ids: string[]; errors: string[]; }

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
    rooms: client.pieces ?? mandatRooms ?? null,
    surface_min: null, type_bien: client.type_bien ?? mandatData?.type_bien ?? null,
    canton: null, type_recherche: (mandatData?.type_recherche as string) ?? null,
    nombre_occupants: client.nombre_occupants ?? mandatData?.nombre_occupants ?? null,
    souhaits_particuliers: client.souhaits_particuliers ?? mandatData?.souhaits_particuliers ?? null,
  };
}

// === END SHARED ===

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ai-relocation-webhook-secret',
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
    // === AUTH: Secret-based M2M ===
    const webhookSecret = req.headers.get('X-AI-Relocation-Webhook-Secret');
    const expectedSecret = Deno.env.get('AI_RELOCATION_WEBHOOK_SECRET');

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return errorResponse('Unauthorized', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { event_type, ...payload } = body;

    if (!event_type) {
      return errorResponse('event_type required', 400);
    }

    let result: unknown;

    switch (event_type) {
      // === MISSION LIFECYCLE ===
      case 'mission.started': {
        const { mission_id, sources_used } = payload;
        if (!mission_id) return errorResponse('mission_id required', 400);

        // UPSERT: find existing running run or create new
        const { data: existingRun } = await adminClient
          .from('mission_execution_runs')
          .select('id')
          .eq('mission_id', mission_id)
          .eq('status', 'running')
          .maybeSingle();

        if (existingRun) {
          await adminClient
            .from('mission_execution_runs')
            .update({
              started_at: new Date().toISOString(),
              sources_searched: sources_used ?? [],
            })
            .eq('id', existingRun.id);
          result = { run_id: existingRun.id, action: 'updated' };
        } else {
          const { data: newRun, error } = await adminClient
            .from('mission_execution_runs')
            .insert({
              mission_id,
              status: 'running' as const,
              started_at: new Date().toISOString(),
              sources_searched: sources_used ?? [],
            })
            .select('id')
            .single();

          if (error) return errorResponse(error.message, 500);
          result = { run_id: newRun.id, action: 'created' };
        }

        await logWebhookActivity(adminClient, payload.ai_agent_id, 'mission_run_started', payload);
        break;
      }

      case 'mission.completed': {
        const { mission_id, run_id, results_found, results_new, duplicates_detected } = payload;
        if (!run_id) return errorResponse('run_id required', 400);

        await adminClient
          .from('mission_execution_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            results_found: results_found ?? 0,
            results_new: results_new ?? 0,
            duplicates_detected: duplicates_detected ?? 0,
          })
          .eq('id', run_id);

        // Update mission counters
        if (mission_id) {
          const { data: currentMission } = await adminClient
            .from('search_missions')
            .select('results_found, results_retained')
            .eq('id', mission_id)
            .single();

          if (currentMission) {
            await adminClient
              .from('search_missions')
              .update({
                results_found: (currentMission.results_found ?? 0) + (results_found ?? 0),
                results_retained: (currentMission.results_retained ?? 0) + (results_new ?? 0),
              })
              .eq('id', mission_id);
          }
        }

        await logWebhookActivity(adminClient, payload.ai_agent_id, 'mission_run_completed', payload);
        result = { success: true };
        break;
      }

      case 'mission.failed': {
        const { run_id, error_message } = payload;
        if (!run_id) return errorResponse('run_id required', 400);

        await adminClient
          .from('mission_execution_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error_message ?? 'Unknown error',
          })
          .eq('id', run_id);

        await logWebhookActivity(adminClient, payload.ai_agent_id, 'mission_run_failed', {
          ...payload,
          error_message,
        });
        result = { success: true };
        break;
      }

      // === RESULTS ===
      case 'results.found': {
        const { mission_id, client_id, ai_agent_id, results: resultRows } = payload;
        if (!mission_id || !client_id || !ai_agent_id || !Array.isArray(resultRows)) {
          return errorResponse('mission_id, client_id, ai_agent_id, and results[] required', 400);
        }

        // Build criteria for scoring
        let criteria: Record<string, unknown> | null = null;
        try {
          criteria = await buildCriteriaSnapshot(adminClient, client_id);
        } catch (err) {
          console.error('Failed to build criteria snapshot:', err);
        }

        const ingestionResult = await ingestResults(adminClient, {
          mission_id,
          client_id,
          ai_agent_id,
          results: resultRows,
          criteria,
        });

        await logWebhookActivity(adminClient, ai_agent_id, 'results_ingested', {
          mission_id,
          client_id,
          inserted: ingestionResult.inserted,
          duplicates: ingestionResult.duplicates,
          failed: ingestionResult.failed,
        });

        result = ingestionResult;
        break;
      }

      // === INFORMATIONAL EVENTS ===
      case 'offer.prepared':
      case 'visit.prepared': {
        await logWebhookActivity(adminClient, payload.ai_agent_id, event_type.replace('.', '_'), payload);
        result = { logged: true };
        break;
      }

      case 'connector.error': {
        await logWebhookActivity(adminClient, payload.ai_agent_id, 'connector_error', {
          ...payload,
          error_message: payload.error_message,
        });
        result = { logged: true };
        break;
      }

      default: {
        await logWebhookActivity(adminClient, payload.ai_agent_id, `webhook_${event_type}`, payload);
        result = { logged: true };
      }
    }

    return jsonResponse({ data: result });
  } catch (error) {
    console.error('AI Relocation Webhook error:', error);
    return errorResponse('Internal server error', 500);
  }
});

// === HELPERS ===

async function logWebhookActivity(
  adminClient: ReturnType<typeof createClient>,
  aiAgentId: string | undefined,
  actionType: string,
  metadata: Record<string, unknown>,
) {
  if (!aiAgentId) return;

  try {
    await adminClient.rpc('log_ai_activity', {
      p_ai_agent_id: aiAgentId,
      p_action_type: actionType,
      p_client_id: metadata.client_id ?? null,
      p_mission_id: metadata.mission_id ?? null,
      p_property_result_id: metadata.property_result_id ?? null,
      p_metadata: metadata,
      p_content_generated: null,
      p_connector_used: metadata.connector_used ?? null,
    });
  } catch (err) {
    console.error('log_ai_activity (webhook) failed:', err);
  }
}
