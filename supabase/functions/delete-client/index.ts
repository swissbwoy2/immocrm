import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteClientRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId }: DeleteClientRequest = await req.json();

    console.log('Deleting client:', userId);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get client ID first to delete related data
    const { data: clientData } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (clientData) {
      // Get conversation IDs for this client
      const { data: conversations } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('client_id', clientData.id);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        
        // Delete messages in these conversations
        const { error: msgError } = await supabaseAdmin
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);

        if (msgError) {
          console.error('Messages delete error:', msgError);
        } else {
          console.log('Messages deleted');
        }
      }

      // Delete conversations
      const { error: convError } = await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('client_id', clientData.id);

      if (convError) {
        console.error('Conversation delete error:', convError);
      } else {
        console.log('Conversations deleted');
      }
    }

    // Delete from clients table
    const { error: clientError } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('user_id', userId);

    if (clientError) {
      console.error('Client delete error:', clientError);
      throw clientError;
    }

    console.log('Client record deleted');

    // Delete from user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (roleError) {
      console.error('Role delete error:', roleError);
      throw roleError;
    }

    console.log('Role deleted');

    // Delete from profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Profile delete error:', profileError);
      throw profileError;
    }

    console.log('Profile deleted');

    // Delete user from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Auth delete error:', authError);
      throw authError;
    }

    console.log('User deleted from auth');

    return new Response(
      JSON.stringify({ 
        message: "Client supprimé avec succès"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in delete-client function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
