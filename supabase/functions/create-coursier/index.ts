import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateCoursierRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prenom, nom, email, telephone }: CreateCoursierRequest = await req.json();

    if (!email || !prenom) {
      throw new Error("Email et prénom sont requis");
    }

    console.log("Creating coursier:", { prenom, nom, email });

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

    // 1. Invite user (creates user and sends invitation email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: "https://immocrm.lovable.app/first-login",
      }
    );

    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }
    if (!authData.user) throw new Error("User not created");

    console.log("User invited in auth:", authData.user.id);

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        prenom,
        nom,
        email,
        telephone,
        actif: true,
      });

    if (profileError) {
      console.error("Profile error:", profileError);
      throw profileError;
    }

    console.log("Profile created");

    // 3. Assign coursier role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "coursier",
      });

    if (roleError) {
      console.error("Role error:", roleError);
      throw roleError;
    }

    console.log("Role assigned: coursier");

    // 4. Create coursier record
    const { error: coursierError } = await supabaseAdmin
      .from("coursiers")
      .insert({
        user_id: authData.user.id,
        statut: "en_attente",
      });

    if (coursierError) {
      console.error("Coursier error:", coursierError);
      throw coursierError;
    }

    console.log("Coursier record created and invitation email sent");

    return new Response(
      JSON.stringify({
        message: "Coursier créé avec succès",
        user: authData.user,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in create-coursier function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
