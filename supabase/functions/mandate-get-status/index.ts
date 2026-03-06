import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch mandate by access_token
    const { data: mandate, error } = await supabase
      .from("mandates")
      .select("id, status, prenom, nom, email, type_recherche, type_bien, zone_recherche, signed_at, created_at, updated_at, token_invalidated_at, activation_deposit_paid")
      .eq("access_token", token)
      .single();

    if (error || !mandate) {
      return new Response(
        JSON.stringify({ success: false, error: "Mandat introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refuse invalidated tokens
    if (mandate.token_invalidated_at !== null) {
      return new Response(
        JSON.stringify({ success: false, error: "Token invalidé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch client-visible audit logs only
    const { data: logs } = await supabase
      .from("mandate_audit_logs")
      .select("event_type, event_description, created_at")
      .eq("mandate_id", mandate.id)
      .eq("is_client_visible", true)
      .order("created_at", { ascending: false })
      .limit(50);

    // Return filtered data only — no IP, hash, internal logs
    return new Response(
      JSON.stringify({
        success: true,
        mandate: {
          prenom: mandate.prenom,
          nom: mandate.nom,
          email: mandate.email,
          status: mandate.status,
          type_recherche: mandate.type_recherche,
          type_bien: mandate.type_bien,
          zone_recherche: mandate.zone_recherche,
          signed_at: mandate.signed_at,
          created_at: mandate.created_at,
          activation_deposit_paid: mandate.activation_deposit_paid,
        },
        logs: logs || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
