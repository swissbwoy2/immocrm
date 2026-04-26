import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANDAT_DURATION_DAYS = 90;
const REFUND_ELIGIBILITY_DAY = 82;

const VALID_REASONS = ["found_alone", "not_searching_anymore", "searching_alone"] as const;
type CancellationReason = typeof VALID_REASONS[number];

const VALID_ACTIONS = ["renew", "cancel", "cancel_with_refund", "pause", "resume"] as const;
type Action = typeof VALID_ACTIONS[number];

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

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
    let cancellationReason: string | null = null;
    let clientIdDirect: string | null = null; // pour pause/resume depuis l'espace client (avec auth header)

    if (req.method === "GET") {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
      action = url.searchParams.get("action");
      cancellationReason = url.searchParams.get("cancellation_reason");
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token ?? null;
      action = body.action ?? null;
      cancellationReason = body.cancellation_reason ?? null;
      clientIdDirect = body.client_id ?? null;
    }

    if (!action || !VALID_ACTIONS.includes(action as Action)) {
      return jsonResponse({ ok: false, error: "Action manquante ou invalide" }, 400);
    }

    const typedAction = action as Action;
    const requiresReason = typedAction === "cancel" || typedAction === "cancel_with_refund";

    if (requiresReason && (!cancellationReason || !VALID_REASONS.includes(cancellationReason as CancellationReason))) {
      return jsonResponse({ ok: false, error: "Raison d'annulation manquante ou invalide" }, 400);
    }

    // Récupérer client : soit via token, soit via client_id (pour pause/resume depuis l'app authentifiée)
    let clientId: string | null = null;
    let tokenRow: any = null;

    if (token) {
      const { data, error } = await supabase
        .from("mandate_renewal_tokens")
        .select("id, client_id, expires_at, used_at, used_action")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        return jsonResponse({ ok: false, error: "Lien invalide ou expiré" }, 404);
      }
      if (new Date(data.expires_at) < new Date()) {
        return jsonResponse({ ok: false, error: "Ce lien a expiré" }, 410);
      }
      if (data.used_at) {
        return jsonResponse({
          ok: true,
          already_used: true,
          previous_action: data.used_action,
        });
      }
      tokenRow = data;
      clientId = data.client_id;
    } else if (clientIdDirect && (typedAction === "pause" || typedAction === "resume")) {
      // Pause/Resume : autoriser via client_id en passant par auth header (vérification user owner)
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ ok: false, error: "Authentification requise" }, 401);
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) {
        return jsonResponse({ ok: false, error: "Session invalide" }, 401);
      }
      // Vérifier que ce client appartient bien à l'utilisateur
      const { data: ownerCheck } = await supabase
        .from("clients")
        .select("id, user_id")
        .eq("id", clientIdDirect)
        .maybeSingle();
      if (!ownerCheck || ownerCheck.user_id !== userData.user.id) {
        return jsonResponse({ ok: false, error: "Accès refusé" }, 403);
      }
      clientId = clientIdDirect;
    } else {
      return jsonResponse({ ok: false, error: "Token ou client_id manquant" }, 400);
    }

    if (!clientId) {
      return jsonResponse({ ok: false, error: "Client introuvable" }, 404);
    }

    // Récupérer le client
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, user_id, agent_id, statut, mandat_date_signature, mandate_paused_at, mandate_pause_days, mandate_official_end_date, refund_status")
      .eq("id", clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return jsonResponse({ ok: false, error: "Client introuvable" }, 404);
    }

    const previousSignatureDate = client.mandat_date_signature;
    const today = new Date();

    // Calcul des jours écoulés (avec gel de la pause)
    let daysSinceSignature = 0;
    if (client.mandat_date_signature) {
      const signatureDate = new Date(client.mandat_date_signature);
      const rawDays = daysBetween(signatureDate, today);
      daysSinceSignature = Math.max(0, rawDays - (client.mandate_pause_days ?? 0));
    }

    // === Logique par action ===
    let dbAction: string;
    let refundEligible = false;

    if (typedAction === "renew") {
      const newSignatureDate = new Date().toISOString();
      const officialEndDate = new Date(today);
      officialEndDate.setDate(officialEndDate.getDate() + MANDAT_DURATION_DAYS);

      await supabase
        .from("clients")
        .update({
          mandat_date_signature: newSignatureDate,
          statut: "actif",
          mandate_pause_days: 0,
          mandate_paused_at: null,
          mandate_official_end_date: officialEndDate.toISOString().split("T")[0],
        })
        .eq("id", client.id);

      dbAction = "renewed";
      await notify(supabase, client, "mandate_renewed", "✅ Mandat renouvelé", `Votre mandat a bien été renouvelé pour ${MANDAT_DURATION_DAYS} jours.`);
      await notifyAgent(supabase, client, "client_mandate_renewed", "✅ Client renouvelle son mandat", "Un de vos clients vient de renouveler son mandat.");
    } else if (typedAction === "cancel" || typedAction === "cancel_with_refund") {
      const reason = cancellationReason as CancellationReason;
      // Calcul éligibilité côté serveur (jamais confiance au client)
      refundEligible = typedAction === "cancel_with_refund"
        && reason !== "found_alone"
        && daysSinceSignature >= REFUND_ELIGIBILITY_DAY;

      // Si demande de remboursement mais non éligible, on rejette
      if (typedAction === "cancel_with_refund" && !refundEligible) {
        const reasonDetail = reason === "found_alone"
          ? "Les remboursements ne sont pas accordés si vous avez trouvé par vos propres moyens."
          : `Le remboursement est disponible à partir du ${REFUND_ELIGIBILITY_DAY}ème jour du mandat (jour actuel : ${daysSinceSignature}).`;
        return jsonResponse({ ok: false, error: `Remboursement non éligible. ${reasonDetail}` }, 400);
      }

      const updates: Record<string, unknown> = {
        statut: "inactif",
        cancellation_reason: reason,
        refund_eligible: refundEligible,
        refund_status: refundEligible ? "pending" : "not_applicable",
      };
      if (refundEligible) {
        updates.refund_requested_at = new Date().toISOString();
      }

      await supabase.from("clients").update(updates).eq("id", client.id);

      dbAction = refundEligible ? "cancelled_with_refund" : "cancelled";

      // Notifications client
      const clientMsg = refundEligible
        ? `Votre demande de remboursement a été enregistrée. Votre mandat reste actif jusqu'au ${client.mandate_official_end_date ?? "jour 90"}. Le remboursement sera traité sous 30 jours après cette date.`
        : reason === "found_alone"
          ? "Félicitations pour votre nouveau logement ! Votre mandat est annulé. (Non éligible au remboursement selon nos CGV)"
          : "Votre mandat de recherche a été annulé. Merci de votre confiance.";
      await notify(supabase, client, "mandate_cancelled", refundEligible ? "💰 Remboursement demandé" : "Mandat annulé", clientMsg);

      // Notifications agent + admins
      await notifyAgent(supabase, client, "client_mandate_cancelled", "❌ Client annule son mandat", `Raison : ${reasonLabel(reason)}${refundEligible ? " — remboursement à traiter" : ""}.`);
      if (refundEligible) {
        await notifyAdmins(supabase, "💰 Demande de remboursement", `Un client a demandé son remboursement. À traiter après le ${client.mandate_official_end_date ?? "jour 90"} (+ 30 jours).`, client.id);
      } else {
        await notifyAdmins(supabase, "❌ Mandat annulé", `Un client a annulé son mandat. Raison : ${reasonLabel(reason)}.`, client.id);
      }
    } else if (typedAction === "pause") {
      if (client.mandate_paused_at) {
        return jsonResponse({ ok: false, error: "Le mandat est déjà en pause" }, 400);
      }
      await supabase
        .from("clients")
        .update({ mandate_paused_at: new Date().toISOString() })
        .eq("id", client.id);
      dbAction = "paused";
      await notify(supabase, client, "mandate_paused", "⏸️ Mandat en pause", "Votre mandat est en pause. Vous pouvez le reprendre à tout moment depuis votre espace.");
      await notifyAgent(supabase, client, "client_mandate_paused", "⏸️ Client met en pause", "Un de vos clients a mis son mandat en pause.");
    } else if (typedAction === "resume") {
      if (!client.mandate_paused_at) {
        return jsonResponse({ ok: false, error: "Le mandat n'est pas en pause" }, 400);
      }
      const pausedAt = new Date(client.mandate_paused_at);
      const additionalPauseDays = daysBetween(pausedAt, today);
      const newPauseDays = (client.mandate_pause_days ?? 0) + Math.max(0, additionalPauseDays);
      await supabase
        .from("clients")
        .update({
          mandate_paused_at: null,
          mandate_pause_days: newPauseDays,
        })
        .eq("id", client.id);
      dbAction = "resumed";
      await notify(supabase, client, "mandate_resumed", "▶️ Mandat repris", `Votre mandat est de nouveau actif. ${additionalPauseDays} jour(s) ont été ajoutés à votre durée totale.`);
      await notifyAgent(supabase, client, "client_mandate_resumed", "▶️ Client reprend son mandat", `Un de vos clients a repris son mandat (${additionalPauseDays} j de pause).`);
    } else {
      return jsonResponse({ ok: false, error: "Action non gérée" }, 400);
    }

    // Log action
    await supabase.from("mandate_renewal_actions").insert({
      client_id: client.id,
      action: dbAction,
      triggered_by: "client",
      previous_signature_date: previousSignatureDate,
      cancellation_reason: cancellationReason,
      refund_eligible: refundEligible,
      days_since_signature: daysSinceSignature,
    });

    // Marquer le token comme utilisé
    if (tokenRow) {
      await supabase
        .from("mandate_renewal_tokens")
        .update({ used_at: new Date().toISOString(), used_action: dbAction })
        .eq("id", tokenRow.id);
    }

    return jsonResponse({
      ok: true,
      action: dbAction,
      refund_eligible: refundEligible,
      days_since_signature: daysSinceSignature,
      client_id: client.id,
    });
  } catch (error) {
    const msg = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    console.error("mandate-renewal-action error:", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function reasonLabel(reason: CancellationReason): string {
  switch (reason) {
    case "found_alone": return "J'ai trouvé par moi-même";
    case "not_searching_anymore": return "Je ne cherche plus";
    case "searching_alone": return "Je continue mes recherches seul";
  }
}

async function notify(supabase: any, client: any, type: string, title: string, message: string) {
  if (!client.user_id) return;
  await supabase.from("notifications").insert({
    user_id: client.user_id,
    type,
    title,
    message,
    link: "/client/mon-contrat",
    metadata: { client_id: client.id },
  });
}

async function notifyAgent(supabase: any, client: any, type: string, title: string, message: string) {
  if (!client.agent_id) return;
  const { data: agent } = await supabase
    .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
  if (agent?.user_id) {
    await supabase.from("notifications").insert({
      user_id: agent.user_id,
      type,
      title,
      message,
      link: "/agent/mes-clients",
      metadata: { client_id: client.id },
    });
  }
}

async function notifyAdmins(supabase: any, title: string, message: string, clientId: string) {
  const { data: admins } = await supabase
    .from("user_roles").select("user_id").eq("role", "admin");
  for (const admin of admins ?? []) {
    await supabase.from("notifications").insert({
      user_id: admin.user_id,
      type: "admin_mandate_update",
      title,
      message,
      link: "/admin/clients",
      metadata: { client_id: clientId },
    });
  }
}
