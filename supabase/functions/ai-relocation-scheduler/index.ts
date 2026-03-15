import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // === AUTH: webhook secret only ===
  const secret = req.headers.get('x-webhook-secret');
  const expectedSecret = Deno.env.get('AI_RELOCATION_WEBHOOK_SECRET');
  if (!expectedSecret || secret !== expectedSecret) {
    console.error('[scheduler] Invalid or missing x-webhook-secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[scheduler] Authenticated. Starting scheduled run...');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const summary = {
    missions_checked: 0,
    triggered: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // === QUERY ELIGIBLE MISSIONS ===
    // Only active missions with scheduled frequency and next_run_at in the past
    const { data: missions, error: queryError } = await adminClient
      .from('search_missions')
      .select('id, frequency, ai_agent_id, client_id')
      .eq('status', 'active')
      .in('frequency', ['quotidien', 'hebdomadaire'])
      .not('next_run_at', 'is', null)
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true });

    if (queryError) {
      console.error('[scheduler] Query error:', queryError.message);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    summary.missions_checked = missions?.length ?? 0;
    console.log(`[scheduler] Found ${summary.missions_checked} eligible missions`);

    if (!missions?.length) {
      return new Response(JSON.stringify(summary), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === PROCESS EACH MISSION ===
    for (const mission of missions) {
      const missionId = mission.id;
      const frequency = mission.frequency;
      const aiAgentId = mission.ai_agent_id;

      console.log(`[scheduler] Triggering mission ${missionId} (freq: ${frequency})`);
      summary.triggered++;

      try {
        // Log scheduler trigger
        await adminClient.from('ai_agent_activity_logs').insert({
          ai_agent_id: aiAgentId,
          action_type: 'scheduler_trigger',
          action_source: 'scheduler',
          mission_id: missionId,
          metadata: { frequency, trigger: 'cron' },
        });

        // Call the existing mission run endpoint with scheduler secret (no Bearer token)
        const response = await fetch(
          `${supabaseUrl}/functions/v1/ai-relocation-api/missions/${missionId}/run`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'x-scheduler-secret': expectedSecret,
            },
            body: JSON.stringify({}),
          },
        );

        if (response.ok) {
          // === SUCCESS: advance next_run_at by frequency interval ===
          const nextRunAt = computeNextRunAt(frequency);
          await adminClient
            .from('search_missions')
            .update({ next_run_at: nextRunAt, last_run_at: new Date().toISOString() })
            .eq('id', missionId);

          console.log(`[scheduler] Mission ${missionId} succeeded. Next run: ${nextRunAt}`);
          summary.succeeded++;

          // Log success
          await adminClient.from('ai_agent_activity_logs').insert({
            ai_agent_id: aiAgentId,
            action_type: 'scheduler_run_success',
            action_source: 'scheduler',
            mission_id: missionId,
            metadata: { next_run_at: nextRunAt },
          });
        } else {
          // === FAILURE: classify transient vs permanent ===
          const status = response.status;
          let errorBody = '';
          try { errorBody = await response.text(); } catch { /* ignore */ }

          const errorMsg = `Mission ${missionId}: HTTP ${status} - ${errorBody.substring(0, 200)}`;
          console.error(`[scheduler] ${errorMsg}`);
          summary.failed++;
          summary.errors.push(errorMsg);

          if (isTransientError(status, errorBody)) {
            // Transient: retry in 1 hour
            const retryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            await adminClient
              .from('search_missions')
              .update({ next_run_at: retryAt })
              .eq('id', missionId);

            console.log(`[scheduler] Transient failure for ${missionId}. Retry at ${retryAt}`);
            await adminClient.from('ai_agent_activity_logs').insert({
              ai_agent_id: aiAgentId,
              action_type: 'scheduler_run_failed_transient',
              action_source: 'scheduler',
              mission_id: missionId,
              error_message: errorMsg,
              metadata: { status, retry_at: retryAt },
            });
          } else {
            // Permanent: do NOT update next_run_at — mission stays overdue and visible to admin
            console.warn(`[scheduler] Permanent failure for ${missionId}. Not rescheduling — will appear as overdue.`);
            await adminClient.from('ai_agent_activity_logs').insert({
              ai_agent_id: aiAgentId,
              action_type: 'scheduler_run_failed_permanent',
              action_source: 'scheduler',
              mission_id: missionId,
              error_message: errorMsg,
              metadata: { status, reason: 'permanent_failure_no_reschedule' },
            });
          }
        }
      } catch (err) {
        // Network/fetch error = transient
        const errorMsg = `Mission ${missionId}: ${String(err)}`;
        console.error(`[scheduler] ${errorMsg}`);
        summary.failed++;
        summary.errors.push(errorMsg);

        // Transient: retry in 1 hour
        const retryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await adminClient
          .from('search_missions')
          .update({ next_run_at: retryAt })
          .eq('id', missionId);

        await adminClient.from('ai_agent_activity_logs').insert({
          ai_agent_id: aiAgentId,
          action_type: 'scheduler_run_failed_transient',
          action_source: 'scheduler',
          mission_id: missionId,
          error_message: errorMsg,
          metadata: { reason: 'network_error', retry_at: retryAt },
        });
      }
    }
  } catch (err) {
    console.error('[scheduler] Fatal error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[scheduler] Run complete:', JSON.stringify(summary));
  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

/**
 * Compute next_run_at based on mission frequency.
 * quotidien → +1 day, hebdomadaire → +7 days
 */
function computeNextRunAt(frequency: string): string {
  const now = Date.now();
  if (frequency === 'quotidien') {
    return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  }
  if (frequency === 'hebdomadaire') {
    return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  // Should not happen for scheduled missions, but return +1 day as safe default
  return new Date(now + 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Classify errors as transient (worth retrying) vs permanent (admin must investigate).
 *
 * Transient: 5xx server errors, network failures, scraping failures
 * Permanent: 4xx client errors (bad config, not found, forbidden, auth failure)
 */
function isTransientError(httpStatus: number, responseBody: string): boolean {
  // 5xx = server-side / transient
  if (httpStatus >= 500) return true;

  // 4xx = permanent (bad request, not found, forbidden, unauthorized)
  if (httpStatus >= 400 && httpStatus < 500) return false;

  // Check response body for scraping-related transient failures
  const lower = responseBody.toLowerCase();
  if (lower.includes('scraping') || lower.includes('firecrawl') || lower.includes('timeout')) {
    return true;
  }

  // Default: treat as permanent to avoid silent retry loops
  return false;
}
