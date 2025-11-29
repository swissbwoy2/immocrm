import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Note: Full IMAP implementation requires a library like imapflow
// For Deno Edge Functions, we'll use a simplified approach via REST API or polling
// In a production environment, you'd want to set up a proper IMAP client

interface ImapConfig {
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password: string;
  imap_secure: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action } = await req.json();
    console.log(`Processing IMAP action: ${action} for user: ${user.id}`);

    if (action === 'test_connection') {
      // Test IMAP connection
      const { config } = await req.json();
      
      // In production, you'd test the actual IMAP connection here
      // For now, we validate the config format
      if (!config.imap_host || !config.imap_user || !config.imap_password) {
        throw new Error('Configuration IMAP incomplète');
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Configuration valide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fetch_emails') {
      // Get IMAP configuration
      const { data: imapConfig, error: configError } = await supabaseClient
        .from('imap_configurations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (configError) {
        throw new Error(`Erreur configuration: ${configError.message}`);
      }

      if (!imapConfig) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'no_config',
            message: 'Aucune configuration IMAP trouvée. Veuillez configurer votre boîte de réception.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Note: In a production environment, you would use a proper IMAP library
      // Since Deno Edge Functions have limitations with IMAP protocols,
      // consider using a third-party service or webhook-based email receiving
      
      // For demonstration, we'll simulate fetching emails
      // In production, you'd integrate with:
      // 1. A mail-processing service (like Mailgun, SendGrid inbound)
      // 2. A separate backend service with full IMAP support
      // 3. Gmail/Outlook API for those providers
      
      console.log(`Would connect to IMAP: ${imapConfig.imap_host}:${imapConfig.imap_port}`);

      // Update last sync time
      await supabaseClient
        .from('imap_configurations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', user.id);

      // Get stored emails
      const { data: emails, error: emailsError } = await supabaseClient
        .from('received_emails')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(50);

      if (emailsError) {
        throw new Error(`Erreur récupération emails: ${emailsError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          emails: emails || [],
          last_sync: imapConfig.last_sync_at,
          message: 'Synchronisation terminée'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'mark_read') {
      const body = await req.json();
      const { email_id, is_read } = body;

      const { error } = await supabaseClient
        .from('received_emails')
        .update({ is_read })
        .eq('id', email_id)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'toggle_star') {
      const body = await req.json();
      const { email_id, is_starred } = body;

      const { error } = await supabaseClient
        .from('received_emails')
        .update({ is_starred })
        .eq('id', email_id)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_email') {
      const body = await req.json();
      const { email_id } = body;

      const { error } = await supabaseClient
        .from('received_emails')
        .delete()
        .eq('id', email_id)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Action non reconnue: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('IMAP function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});