import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { ingestResults, buildCriteriaSnapshot } from "../_shared/result-ingestion.ts";

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
              sources_used: sources_used ?? [],
            })
            .eq('id', existingRun.id);
          result = { run_id: existingRun.id, action: 'updated' };
        } else {
          const { data: newRun, error } = await adminClient
            .from('mission_execution_runs')
            .insert({
              mission_id,
              status: 'running',
              started_at: new Date().toISOString(),
              sources_used: sources_used ?? [],
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
