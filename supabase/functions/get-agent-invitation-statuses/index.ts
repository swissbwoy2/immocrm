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
    const { userIds = [], emails = [] } = await req.json().catch(() => ({}));

    const requestedUserIds = new Set(
      Array.isArray(userIds) ? userIds.filter((value): value is string => typeof value === "string" && value.length > 0) : [],
    );
    const requestedEmails = new Set(
      Array.isArray(emails)
        ? emails
            .filter((value): value is string => typeof value === "string" && value.length > 0)
            .map((value) => value.trim().toLowerCase())
        : [],
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const statuses = (data?.users ?? [])
      .filter((user) => {
        const userEmail = user.email?.trim().toLowerCase();
        return requestedUserIds.has(user.id) || (userEmail ? requestedEmails.has(userEmail) : false);
      })
      .map((user) => ({
        userId: user.id,
        email: user.email ?? null,
        invitedAt: user.invited_at ?? null,
        confirmationSentAt: user.confirmation_sent_at ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? user.confirmed_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        appBaseUrl: getAppBaseUrl(req),
      }));

    return new Response(JSON.stringify({ statuses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Erreur lors de la récupération du statut d'invitation des agents:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
