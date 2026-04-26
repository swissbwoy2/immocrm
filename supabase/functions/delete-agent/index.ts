import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteAgentRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId }: DeleteAgentRequest = await req.json();

    console.log('Deleting agent:', userId);

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

    // Delete from agents table
    const { error: agentError } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('user_id', userId);

    if (agentError) {
      console.error('Agent delete error:', agentError);
      throw agentError;
    }

    console.log('Agent record deleted');

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
        message: "Agent supprimé avec succès"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in delete-agent function:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
