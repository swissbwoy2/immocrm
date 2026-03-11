import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { ingestResults, buildCriteriaSnapshot } from "../_shared/result-ingestion.ts";

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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse('Invalid token', 401);
    }

    const userId = claimsData.claims.sub as string;

    // Role check: agent_ia or admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const userRoles = (roles ?? []).map((r: { role: string }) => r.role);
    if (!userRoles.includes('agent_ia') && !userRoles.includes('admin')) {
      return errorResponse('Forbidden: agent_ia or admin role required', 403);
    }

    // Load AI agent profile
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: aiAgent } = await adminClient
      .from('ai_agents')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

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
  const { client_id, frequency, allowed_sources, name } = body;

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

  const { data: mission, error } = await adminClient
    .from('search_missions')
    .insert({
      ai_agent_id: aiAgent.id,
      client_id,
      name: name ?? 'Recherche automatique',
      criteria_snapshot: criteria,
      frequency: frequency ?? 'daily',
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

async function handleMissionsRun(
  adminClient: ReturnType<typeof createClient>,
  aiAgent: Record<string, unknown>,
  missionId: string,
  req: Request,
) {
  // Validate mission is active and belongs to this agent
  const { data: mission } = await adminClient
    .from('search_missions')
    .select('id, client_id, status')
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

  return jsonResponse({ data: run });
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
