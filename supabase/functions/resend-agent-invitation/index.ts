import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Récupérer l'email si on a seulement le userId
    let agentEmail = email;
    if (!agentEmail && userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      agentEmail = profile?.email;
    }

    if (!agentEmail) {
      throw new Error("Email non trouvé");
    }

    console.log("Renvoi d'invitation pour:", agentEmail);

    // Envoyer un email de réinitialisation de mot de passe
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      agentEmail,
      { redirectTo: 'https://immocrm.lovable.app/first-login' }
    );

    // Si l'utilisateur existe déjà, utiliser resetPasswordForEmail
    if (inviteError?.message?.includes('already been registered')) {
      console.log("Utilisateur déjà enregistré, envoi de reset password");
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        agentEmail,
        { redirectTo: 'https://immocrm.lovable.app/first-login' }
      );
      if (resetError) throw resetError;
    } else if (inviteError) {
      throw inviteError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitation renvoyée avec succès" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Erreur lors du renvoi de l'invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
