import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_APP_URL = "https://immocrm.lovable.app";

const getAppBaseUrl = (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Ignore invalid referer values
    }
  }

  return DEFAULT_APP_URL;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId } = await req.json();
    const redirectTo = `${getAppBaseUrl(req)}/first-login`;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    let agentEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!agentEmail && userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();
      agentEmail = profile?.email?.trim().toLowerCase() ?? "";
    }

    if (!agentEmail) {
      throw new Error("Email non trouvé");
    }

    console.log("Renvoi d'invitation pour:", agentEmail, "redirect:", redirectTo);

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(agentEmail, {
      redirectTo,
    });

    let mode: "invite" | "recovery" = "invite";

    if (inviteError?.message?.includes("already been registered")) {
      console.log("Utilisateur déjà enregistré, envoi de reset password");
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(agentEmail, {
        redirectTo,
      });
      if (resetError) throw resetError;
      mode = "recovery";
    } else if (inviteError) {
      throw inviteError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        message: mode === "recovery" ? "Email de définition de mot de passe renvoyé" : "Invitation renvoyée avec succès",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error("Erreur lors du renvoi de l'invitation:", error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
