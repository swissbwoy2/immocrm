import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-openclaw-webhook-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const webhookSecret = req.headers.get('X-OpenClaw-Webhook-Secret');
    const expectedSecret = Deno.env.get('OPENCLAW_WEBHOOK_SECRET');

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { event_type, ai_agent_id, ...payload } = body;

    if (!event_type || !ai_agent_id) {
      return new Response(JSON.stringify({ error: 'event_type and ai_agent_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the AI agent exists
    const { data: aiAgent } = await adminClient
      .from('ai_agents')
      .select('id, status')
      .eq('id', ai_agent_id)
      .single();

    if (!aiAgent || aiAgent.status !== 'active') {
      return new Response(JSON.stringify({ error: 'AI agent not found or inactive' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let result: unknown;

    switch (event_type) {
      case 'search_results': {
        // Batch insert property matches from search
        if (!payload.matches || !Array.isArray(payload.matches)) {
          return new Response(JSON.stringify({ error: 'matches array required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const records = payload.matches.map((match: Record<string, unknown>) => ({
          ai_agent_id,
          client_id: match.client_id || payload.client_id,
          source_url: match.source_url,
          source_platform: match.source_platform,
          title: match.title,
          address: match.address,
          location: match.location,
          price: match.price,
          rooms: match.rooms,
          surface: match.surface,
          property_type: match.property_type,
          description: match.description,
          images: match.images || [],
          match_score: match.match_score,
          match_details: match.match_details || {},
          status: 'found',
        }));

        const { data, error } = await adminClient
          .from('ai_agent_property_matches')
          .insert(records)
          .select();

        if (error) {
          console.error('Error inserting matches:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Log the action
        await adminClient.from('ai_agent_actions').insert({
          ai_agent_id,
          client_id: payload.client_id,
          action_type: 'search',
          action_payload: { count: records.length, source: 'webhook' },
          status: 'executed',
          requires_approval: false,
          executed_at: new Date().toISOString(),
          source_type: 'webhook',
        });

        result = { inserted: data?.length || 0 };
        break;
      }

      case 'status_update': {
        // Log a status update from OpenClaw
        await adminClient.from('ai_agent_actions').insert({
          ai_agent_id,
          client_id: payload.client_id,
          action_type: 'update_pipeline',
          action_payload: payload,
          status: 'executed',
          requires_approval: false,
          executed_at: new Date().toISOString(),
          source_type: 'webhook',
        });
        result = { success: true };
        break;
      }

      case 'draft_created': {
        // OpenClaw created a draft externally, save it
        const { data } = await adminClient
          .from('ai_agent_drafts')
          .insert({
            ai_agent_id,
            client_id: payload.client_id,
            property_match_id: payload.property_match_id,
            draft_type: payload.draft_type || 'email',
            channel: payload.channel || 'outlook',
            recipient_email: payload.recipient_email,
            recipient_name: payload.recipient_name,
            subject: payload.subject,
            body: payload.body,
            attachments: payload.attachments || [],
            status: 'pending_approval',
          })
          .select()
          .single();

        result = data;
        break;
      }

      default: {
        // Generic event logging
        await adminClient.from('ai_agent_actions').insert({
          ai_agent_id,
          action_type: 'search', // default non-sensitive
          action_payload: { event_type, ...payload },
          status: 'executed',
          requires_approval: false,
          executed_at: new Date().toISOString(),
          source_type: 'webhook',
        });
        result = { logged: true };
      }
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
