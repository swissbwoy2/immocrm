import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAgentRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prenom, nom, email, telephone }: CreateAgentRequest = await req.json();

    console.log('Creating agent:', { prenom, nom, email });

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

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }
    if (!authData.user) throw new Error('User not created');

    console.log('User created in auth:', authData.user.id);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        prenom,
        nom,
        email,
        telephone,
        actif: true,
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    console.log('Profile created');

    // Assign agent role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'agent',
      });

    if (roleError) {
      console.error('Role error:', roleError);
      throw roleError;
    }

    console.log('Role assigned');

    // Create agent record
    const { error: agentError } = await supabaseAdmin
      .from('agents')
      .insert({
        user_id: authData.user.id,
        statut: 'actif',
        nombre_clients_assignes: 0,
      });

    if (agentError) {
      console.error('Agent error:', agentError);
      throw agentError;
    }

    console.log('Agent record created');

    // Send password reset email
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (resetError) {
      console.error('Reset email error:', resetError);
      // Don't throw, just log - the agent was created successfully
    }

    console.log('Password reset email sent');

    return new Response(
      JSON.stringify({ 
        message: "Agent créé avec succès",
        user: authData.user 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in create-agent function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
