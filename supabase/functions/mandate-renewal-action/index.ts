import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANDAT_DURATION_DAYS = 90;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let token: string | null = null;
    let action: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
      action = url.searchParams.get("action");
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token ?? null;
      action = body.action ?? null;
    }

    if (!token || !action || !["renew", "cancel"].includes(action)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Token ou action manquant/invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Vérifier le token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("mandate_renewal_tokens")
      .select("id, client_id, expires_at, used_at, used_action")
      .eq("token", token)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return new Response(
        JSON.stringify({ ok: false, error: "Lien invalide ou expiré" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ ok: false, error: "Ce lien a expiré" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (tokenRow.used_at) {
      return new Response(
        JSON.stringify({
          ok: true,
          already_used: true,
          previous_action: tokenRow.used_action,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Récupérer le client
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, user_id, agent_id, statut, mandat_date_signature")
      .eq("id", tokenRow.client_id)
      .maybeSingle();

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({ ok: false, error: "Client introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const previousSignatureDate = client.mandat_date_signature;
    const dbAction = action === "renew" ? "renewed" : "cancelled";

    // 3. Appliquer l'action
    if (action === "renew") {
      const newSignatureDate = new Date().toISOString();
      await supabase
        .from("clients")
        .update({
          mandat_date_signature: newSignatureDate,
          statut: "actif",
        })
        .eq("id", client.id);

      await supabase.from("mandate_renewal_actions").insert({
        client_id: client.id,
        action: "renewed",
        triggered_by: "client",
        previous_signature_date: previousSignatureDate,
        new_signature_date: newSignatureDate,
      });

      // Notifications
      if (client.user_id) {
        await supabase.from("notifications").insert({
          user_id: client.user_id,
          type: "mandate_renewed",
          title: "✅ Mandat renouvelé",
          message: `Votre mandat de recherche a bien été renouvelé pour ${MANDAT_DURATION_DAYS} jours.`,
          link: "/client/mon-contrat",
          metadata: { client_id: client.id },
        });
      }
      if (client.agent_id) {
        const { data: agent } = await supabase
          .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
        if (agent?.user_id) {
          await supabase.from("notifications").insert({
            user_id: agent.user_id,
            type: "client_mandate_renewed",
            title: "✅ Client renouvelle son mandat",
            message: "Un de vos clients vient de renouveler son mandat.",
            link: "/agent/mes-clients",
            metadata: { client_id: client.id },
          });
        }
      }
    } else {
      // cancel
      await supabase
        .from("clients")
        .update({ statut: "inactif" })
        .eq("id", client.id);

      await supabase.from("mandate_renewal_actions").insert({
        client_id: client.id,
        action: "cancelled",
        triggered_by: "client",
        previous_signature_date: previousSignatureDate,
      });

      if (client.user_id) {
        await supabase.from("notifications").insert({
          user_id: client.user_id,
          type: "mandate_cancelled",
          title: "Recherche annulée",
          message: "Votre mandat de recherche a été annulé. Vous pouvez nous recontacter à tout moment.",
          link: "/client/mon-contrat",
          metadata: { client_id: client.id },
        });
      }
      if (client.agent_id) {
        const { data: agent } = await supabase
          .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
        if (agent?.user_id) {
          await supabase.from("notifications").insert({
            user_id: agent.user_id,
            type: "client_mandate_cancelled",
            title: "❌ Client annule son mandat",
            message: "Un de vos clients a annulé son mandat de recherche.",
            link: "/agent/mes-clients",
            metadata: { client_id: client.id },
          });
        }
      }
      // Notifier admins
      const { data: admins } = await supabase
        .from("user_roles").select("user_id").eq("role", "admin");
      for (const admin of admins ?? []) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          type: "client_mandate_cancelled_admin",
          title: "❌ Mandat annulé par client",
          message: "Un client a annulé son mandat de recherche depuis le lien email.",
          link: "/admin/mandats",
          metadata: { client_id: client.id },
        });
      }
    }

    // 4. Marquer le token comme utilisé
    await supabase
      .from("mandate_renewal_tokens")
      .update({ used_at: new Date().toISOString(), used_action: dbAction })
      .eq("id", tokenRow.id);

    return new Response(
      JSON.stringify({
        ok: true,
        action: dbAction,
        client_id: client.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("mandate-renewal-action error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
