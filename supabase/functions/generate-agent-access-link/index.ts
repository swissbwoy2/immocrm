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

const getRedirectTo = (req: Request) => `${getAppBaseUrl(req)}/first-login`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      throw usersError;
    }

    let targetUser = (usersData?.users ?? []).find(
      (user) => user.id === userId || user.email?.trim().toLowerCase() === normalizedEmail,
    );

    let agentEmail = targetUser?.email?.trim().toLowerCase() ?? normalizedEmail;

    if (!agentEmail && userId) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      agentEmail = profile?.email?.trim().toLowerCase() ?? "";
      targetUser = targetUser ?? (usersData?.users ?? []).find((user) => user.email?.trim().toLowerCase() === agentEmail);
    }

    if (!agentEmail) {
      throw new Error("Email non trouvé");
    }

    const linkType = targetUser?.email_confirmed_at || targetUser?.confirmed_at || targetUser?.last_sign_in_at
      ? "recovery"
      : "invite";
    const redirectTo = getRedirectTo(req);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: linkType,
      email: agentEmail,
      options: { redirectTo },
    });

    if (linkError) {
      throw linkError;
    }

    const actionLink = linkData?.properties?.action_link;

    if (!actionLink) {
      throw new Error("Lien d'accès non généré");
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: agentEmail,
        linkType,
        actionLink,
        redirectTo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error("Erreur lors de la génération du lien d'accès agent:", error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
