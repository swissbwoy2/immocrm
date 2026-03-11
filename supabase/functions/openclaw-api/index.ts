import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-openclaw-token',
};

// Actions that ALWAYS require admin approval before execution
const SENSITIVE_ACTIONS = [
  'send_email', 'submit_candidature', 'contact_agency',
  'update_critical_status', 'delete_data', 'trigger_external'
];

const NON_SENSITIVE_ACTIONS = [
  'search', 'prepare_draft', 'prepare_candidature',
  'log_call', 'create_match', 'update_pipeline'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = claimsData.claims.sub as string;

    // Verify user has agent_ia role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!roleData || roleData.role !== 'agent_ia') {
      return new Response(JSON.stringify({ error: 'Forbidden: agent_ia role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get AI agent profile
    const { data: aiAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!aiAgent) {
      return new Response(JSON.stringify({ error: 'AI agent not found or inactive' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Optional: verify X-OpenClaw-Token header matches stored hash
    const openclawToken = req.headers.get('X-OpenClaw-Token');
    if (aiAgent.api_token_hash && openclawToken) {
      // Simple comparison — in production, use proper hash comparison
      const encoder = new TextEncoder();
      const data = encoder.encode(openclawToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      if (hashHex !== aiAgent.api_token_hash) {
        return new Response(JSON.stringify({ error: 'Invalid API token' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const body = await req.json();
    const { action, ...params } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use service role for admin-level operations within the function
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let result: unknown;

    switch (action) {
      // === READ ACTIONS ===
      case 'get_assigned_clients': {
        const { data } = await adminClient
          .from('ai_agent_assignments')
          .select(`
            *,
            clients:client_id (
              id, user_id, statut, priorite, date_ajout, agent_id, budget_min, budget_max,
              type_bien_recherche, nombre_pieces_min, localisation_souhaitee,
              profiles:user_id (prenom, nom, email, telephone)
            )
          `)
          .eq('ai_agent_id', aiAgent.id)
          .eq('status', 'active');
        result = data;
        break;
      }

      case 'get_client_criteria': {
        if (!params.client_id) {
          return new Response(JSON.stringify({ error: 'client_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        // Verify client is assigned
        const { data: assignment } = await adminClient
          .from('ai_agent_assignments')
          .select('id')
          .eq('ai_agent_id', aiAgent.id)
          .eq('client_id', params.client_id)
          .eq('status', 'active')
          .single();

        if (!assignment) {
          return new Response(JSON.stringify({ error: 'Client not assigned to this agent' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data } = await adminClient
          .from('clients')
          .select(`
            *, 
            profiles:user_id (prenom, nom, email, telephone),
            demandes_mandat:user_id (
              type_recherche, budget_min, budget_max, region_recherche,
              type_bien, nombre_pieces_min, nombre_pieces_max, surface_min,
              criteres_specifiques
            )
          `)
          .eq('id', params.client_id)
          .single();
        result = data;
        break;
      }

      case 'get_client_documents': {
        if (!params.client_id) {
          return new Response(JSON.stringify({ error: 'client_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const { data: assignment } = await adminClient
          .from('ai_agent_assignments')
          .select('id')
          .eq('ai_agent_id', aiAgent.id)
          .eq('client_id', params.client_id)
          .eq('status', 'active')
          .single();

        if (!assignment) {
          return new Response(JSON.stringify({ error: 'Client not assigned' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: client } = await adminClient
          .from('clients')
          .select('user_id')
          .eq('id', params.client_id)
          .single();

        if (client) {
          const { data } = await adminClient
            .from('documents')
            .select('*')
            .eq('user_id', client.user_id);
          result = data;
        }
        break;
      }

      case 'get_property_matches': {
        const { data } = await adminClient
          .from('ai_agent_property_matches')
          .select('*')
          .eq('ai_agent_id', aiAgent.id)
          .order('created_at', { ascending: false })
          .limit(params.limit || 50);
        result = data;
        break;
      }

      case 'get_pending_approvals': {
        const { data } = await adminClient
          .from('ai_agent_actions')
          .select('*')
          .eq('ai_agent_id', aiAgent.id)
          .eq('status', 'pending')
          .eq('requires_approval', true)
          .order('created_at', { ascending: false });
        result = data;
        break;
      }

      case 'get_drafts': {
        const { data } = await adminClient
          .from('ai_agent_drafts')
          .select('*')
          .eq('ai_agent_id', aiAgent.id)
          .order('created_at', { ascending: false })
          .limit(params.limit || 50);
        result = data;
        break;
      }

      // === WRITE ACTIONS (controlled, no execution) ===
      case 'create_property_match': {
        if (!params.client_id || !params.title) {
          return new Response(JSON.stringify({ error: 'client_id and title required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const { data } = await adminClient
          .from('ai_agent_property_matches')
          .insert({
            ai_agent_id: aiAgent.id,
            client_id: params.client_id,
            source_url: params.source_url,
            source_platform: params.source_platform,
            title: params.title,
            address: params.address,
            location: params.location,
            price: params.price,
            rooms: params.rooms,
            surface: params.surface,
            property_type: params.property_type,
            description: params.description,
            images: params.images || [],
            match_score: params.match_score,
            match_details: params.match_details || {},
            status: 'found',
          })
          .select()
          .single();
        result = data;

        // Log action
        await adminClient.from('ai_agent_actions').insert({
          ai_agent_id: aiAgent.id,
          client_id: params.client_id,
          action_type: 'create_match',
          action_payload: params,
          status: 'executed',
          requires_approval: false,
          executed_at: new Date().toISOString(),
          source_type: 'api',
        });
        break;
      }

      case 'create_draft': {
        if (!params.draft_type || !params.subject) {
          return new Response(JSON.stringify({ error: 'draft_type and subject required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const { data } = await adminClient
          .from('ai_agent_drafts')
          .insert({
            ai_agent_id: aiAgent.id,
            client_id: params.client_id,
            property_match_id: params.property_match_id,
            draft_type: params.draft_type,
            channel: params.channel || 'outlook',
            recipient_email: params.recipient_email,
            recipient_name: params.recipient_name,
            subject: params.subject,
            body: params.body,
            attachments: params.attachments || [],
            status: 'draft',
          })
          .select()
          .single();
        result = data;

        await adminClient.from('ai_agent_actions').insert({
          ai_agent_id: aiAgent.id,
          client_id: params.client_id,
          action_type: 'prepare_draft',
          action_payload: { draft_id: data?.id, subject: params.subject },
          status: 'executed',
          requires_approval: false,
          executed_at: new Date().toISOString(),
          source_type: 'api',
        });
        break;
      }

      case 'request_approval': {
        if (!params.action_type) {
          return new Response(JSON.stringify({ error: 'action_type required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const isSensitive = SENSITIVE_ACTIONS.includes(params.action_type);
        const { data } = await adminClient
          .from('ai_agent_actions')
          .insert({
            ai_agent_id: aiAgent.id,
            client_id: params.client_id,
            property_id: params.property_id,
            action_type: params.action_type,
            action_payload: params.payload || {},
            draft_content: params.draft_content,
            status: 'pending',
            requires_approval: true,
            channel: params.channel,
            source_type: 'api',
          })
          .select()
          .single();
        result = data;
        break;
      }

      case 'log_action': {
        const actionType = params.action_type || 'search';
        if (SENSITIVE_ACTIONS.includes(actionType)) {
          return new Response(JSON.stringify({ error: 'Cannot directly log sensitive actions' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const { data } = await adminClient
          .from('ai_agent_actions')
          .insert({
            ai_agent_id: aiAgent.id,
            client_id: params.client_id,
            action_type: actionType,
            action_payload: params.payload || {},
            status: 'executed',
            requires_approval: false,
            executed_at: new Date().toISOString(),
            source_type: 'api',
          })
          .select()
          .single();
        result = data;
        break;
      }

      case 'log_call': {
        const { data } = await adminClient
          .from('ai_agent_call_logs')
          .insert({
            ai_agent_id: aiAgent.id,
            client_id: params.client_id,
            agency_name: params.agency_name,
            contact_name: params.contact_name,
            phone_number: params.phone_number,
            call_script: params.call_script,
            call_notes: params.call_notes,
            call_result: params.call_result,
            next_callback_at: params.next_callback_at,
            status: params.status || 'planned',
          })
          .select()
          .single();
        result = data;

        await adminClient.from('ai_agent_actions').insert({
          ai_agent_id: aiAgent.id,
          client_id: params.client_id,
          action_type: 'log_call',
          action_payload: { agency: params.agency_name, result: params.call_result },
          status: 'executed',
          requires_approval: false,
          executed_at: new Date().toISOString(),
          channel: 'phone',
          source_type: 'api',
        });
        break;
      }

      case 'update_pipeline_status': {
        if (!params.client_id || !params.new_status) {
          return new Response(JSON.stringify({ error: 'client_id and new_status required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        await adminClient.from('ai_agent_actions').insert({
          ai_agent_id: aiAgent.id,
          client_id: params.client_id,
          action_type: 'update_pipeline',
          action_payload: { new_status: params.new_status, previous_status: params.previous_status },
          status: 'executed',
          requires_approval: false,
          executed_at: new Date().toISOString(),
          source_type: 'api',
        });
        result = { success: true, status: params.new_status };
        break;
      }

      // === EXECUTION (requires prior approval) ===
      case 'execute_approved_action': {
        if (!params.action_id) {
          return new Response(JSON.stringify({ error: 'action_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const { data: actionRecord } = await adminClient
          .from('ai_agent_actions')
          .select('*')
          .eq('id', params.action_id)
          .eq('ai_agent_id', aiAgent.id)
          .single();

        if (!actionRecord) {
          return new Response(JSON.stringify({ error: 'Action not found' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (actionRecord.requires_approval && !actionRecord.approved_by) {
          return new Response(JSON.stringify({ error: 'Action not yet approved by admin' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (actionRecord.status !== 'approved') {
          return new Response(JSON.stringify({ error: 'Action status must be approved' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Mark as executed
        await adminClient
          .from('ai_agent_actions')
          .update({
            status: 'executed',
            executed_at: new Date().toISOString(),
            execution_result: { executed_by: 'openclaw-api' },
          })
          .eq('id', params.action_id);

        result = { success: true, action_id: params.action_id };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('OpenClaw API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
