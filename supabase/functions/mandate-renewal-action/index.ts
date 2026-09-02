import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const ADMIN_EMAIL = "info@immo-rama.ch";
const STAFF_FROM = "Logisorama <support@logisorama.ch>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANDAT_DURATION_DAYS = 90;
const REFUND_ELIGIBILITY_DAY = 80;

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
    let clientIdDirect: string | null = null;
    // Trust mode for whatsapp-webhook calls (server-to-server with phone validation already done)
    let webhookTrust: { client_id: string; phone: string } | null = null;
    // Staff trust mode (admin or assigned agent triggers cancel/refund for client)
    let staffTrust: { client_id: string; role: "admin" | "agent" } | null = null;

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

      // === Mode TEST email (aperçu de l'email réellement envoyé au client) ===
      if (body.action === "test_staff_email" && body.client_id) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return jsonResponse({ ok: false, error: "Auth requise" }, 401);
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: userData } = await userClient.auth.getUser();
        if (!userData?.user) return jsonResponse({ ok: false, error: "Session invalide" }, 401);
        const { data: adminRole } = await supabase
          .from("user_roles").select("role")
          .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
        if (!adminRole) return jsonResponse({ ok: false, error: "Admin uniquement" }, 403);

        const { data: cli } = await supabase
          .from("clients").select("id, user_id, agent_id, mandate_official_end_date")
          .eq("id", body.client_id).maybeSingle();
        if (!cli) return jsonResponse({ ok: false, error: "Client introuvable" }, 404);
        const { data: cliProfile } = await supabase
          .from("profiles").select("prenom, nom, email").eq("id", cli.user_id).maybeSingle();
        const firstName = cliProfile?.prenom ?? "Client";

        const recipients: string[] = [ADMIN_EMAIL];
        let agentEmail: string | null = null;
        if (cli.agent_id) {
          const { data: agentRow } = await supabase
            .from("agents").select("user_id").eq("id", cli.agent_id).maybeSingle();
          if (agentRow?.user_id) {
            const { data: agentProfile } = await supabase
              .from("profiles").select("email").eq("id", agentRow.user_id).maybeSingle();
            if (agentProfile?.email) {
              agentEmail = agentProfile.email;
              recipients.push(agentProfile.email);
            }
          }
        }

        const officialEnd = cli.mandate_official_end_date ?? new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
        const refundProcessDate = (() => { const d = new Date(officialEnd); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })();

        const { subject, html } = buildClientEmail({
          variant: "refund",
          initiator: "admin",
          firstName,
          officialEnd,
          refundProcessDate,
          daysSinceSignature: 82,
          isTest: true,
        });

        console.log("[TEST client email preview] recipients:", recipients);
        const result = await sendBrandedEmailResult(subject, html, recipients, []);
        return jsonResponse({
          ok: result.ok,
          recipients,
          admin_email: ADMIN_EMAIL,
          agent_email: agentEmail,
          error: result.error,
        }, result.ok ? 200 : 500);
      }

      clientIdDirect = body.client_id ?? null;
      if (body.triggered_by === "whatsapp_webhook" && body.client_id && body.phone) {
        const authHeader = req.headers.get("Authorization") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        if (authHeader === `Bearer ${serviceKey}`) {
          webhookTrust = { client_id: body.client_id, phone: body.phone };
        }
      }
      if (body.triggered_by === "staff" && body.client_id) {
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
        const callerUserId = userData.user.id;

        const { data: adminRole } = await supabase
          .from("user_roles").select("role")
          .eq("user_id", callerUserId).eq("role", "admin").maybeSingle();

        let role: "admin" | "agent" | null = adminRole ? "admin" : null;

        if (!role) {
          const { data: agentRow } = await supabase
            .from("agents").select("id").eq("user_id", callerUserId).maybeSingle();
          if (agentRow?.id) {
            const { data: cli } = await supabase
              .from("clients").select("agent_id").eq("id", body.client_id).maybeSingle();
            if (cli?.agent_id === agentRow.id) {
              role = "agent";
            } else {
              const { data: coAssign } = await supabase
                .from("client_agents").select("agent_id")
                .eq("client_id", body.client_id).eq("agent_id", agentRow.id).maybeSingle();
              if (coAssign) role = "agent";
            }
          }
        }

        if (!role) return jsonResponse({ ok: false, error: "Accès refusé" }, 403);
        staffTrust = { client_id: body.client_id, role };
      }
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
    } else if (clientIdDirect && (
      typedAction === "pause" ||
      typedAction === "resume" ||
      typedAction === "cancel" ||
      typedAction === "cancel_with_refund"
    )) {
      // Pause/Resume/Cancel/Cancel+Refund : autoriser via client_id en passant par auth header (vérification user owner)
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
    } else if (webhookTrust) {
      // Webhook trust: validate phone matches client's profile before proceeding
      const { data: trustedClient } = await supabase
        .from("clients")
        .select("id, user_id")
        .eq("id", webhookTrust.client_id)
        .maybeSingle();
      if (!trustedClient) return jsonResponse({ ok: false, error: "Client introuvable" }, 404);

      const { data: trustedProfile } = await supabase
        .from("profiles")
        .select("whatsapp_phone, telephone")
        .eq("id", trustedClient.user_id)
        .maybeSingle();

      const normalizedTrustPhone = webhookTrust.phone.replace(/[^\d]/g, "");
      const profilePhones = [trustedProfile?.whatsapp_phone, trustedProfile?.telephone]
        .filter(Boolean)
        .map((p) => p!.replace(/[^\d]/g, ""));

      const phoneMatches = profilePhones.some((p) => p.endsWith(normalizedTrustPhone) || normalizedTrustPhone.endsWith(p));
      if (!phoneMatches) {
        return jsonResponse({ ok: false, error: "Numéro non vérifié" }, 403);
      }
      clientId = webhookTrust.client_id;
    } else if (staffTrust) {
      clientId = staffTrust.client_id;
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
      // Fenêtre de remboursement : jour 80 → jour 90 inclus.
      // À partir du jour 91, le mandat est auto-renouvelé → remboursement impossible.
      const inRefundWindow =
        daysSinceSignature >= REFUND_ELIGIBILITY_DAY &&
        daysSinceSignature <= MANDAT_DURATION_DAYS;
      refundEligible = typedAction === "cancel_with_refund"
        && reason !== "found_alone"
        && inRefundWindow;

      // Si demande de remboursement mais non éligible, on rejette
      if (typedAction === "cancel_with_refund" && !refundEligible) {
        let reasonDetail: string;
        if (reason === "found_alone") {
          reasonDetail = "Les remboursements ne sont pas accordés si vous avez trouvé par vos propres moyens.";
        } else if (daysSinceSignature > MANDAT_DURATION_DAYS) {
          const cyclesPassed = Math.floor(daysSinceSignature / MANDAT_DURATION_DAYS);
          const nextCycleStartDay = cyclesPassed * MANDAT_DURATION_DAYS;
          const sig = client.mandat_date_signature ? new Date(client.mandat_date_signature) : new Date();
          const pauseOffset = client.mandate_pause_days ?? 0;
          const nextWindowStart = new Date(sig);
          nextWindowStart.setDate(nextWindowStart.getDate() + nextCycleStartDay + REFUND_ELIGIBILITY_DAY + pauseOffset);
          const nextWindowEnd = new Date(sig);
          nextWindowEnd.setDate(nextWindowEnd.getDate() + nextCycleStartDay + MANDAT_DURATION_DAYS + pauseOffset);
          const fmt = (d: Date) => d.toLocaleDateString("fr-CH", { timeZone: 'Europe/Zurich', day: "2-digit", month: "long", year: "numeric" });
          reasonDetail = `Votre mandat s'est automatiquement renouvelé. La fenêtre de remboursement (jours ${REFUND_ELIGIBILITY_DAY} à ${MANDAT_DURATION_DAYS}) est close pour ce cycle. Vous pourrez en faire la demande lors du prochain cycle, entre le ${fmt(nextWindowStart)} et le ${fmt(nextWindowEnd)}.`;
        } else {
          reasonDetail = `Le remboursement est disponible entre le ${REFUND_ELIGIBILITY_DAY}ème et le ${MANDAT_DURATION_DAYS}ème jour du mandat (jour actuel : ${daysSinceSignature}).`;
        }
        return jsonResponse({ ok: false, error: `Remboursement non éligible. ${reasonDetail}` }, 400);
      }

      // IMPORTANT : on NE passe PAS statut à 'inactif' ici.
      // Le mandat reste actif jusqu'à mandate_official_end_date, puis le cron
      // mandate-expiry-reminders le passera automatiquement à 'stoppe'.
      const updates: Record<string, unknown> = {
        cancellation_reason: reason,
        cancellation_requested_at: new Date().toISOString(),
        refund_eligible: refundEligible,
        refund_status: refundEligible ? "pending" : "not_applicable",
      };
      if (refundEligible) {
        updates.refund_requested_at = new Date().toISOString();
      }

      await supabase.from("clients").update(updates).eq("id", client.id);

      // Récupérer nom du client pour les messages
      const { data: clientProfile } = await supabase
        .from("profiles").select("prenom, nom, email").eq("id", client.user_id).maybeSingle();
      const clientFullName = clientProfile ? `${clientProfile.prenom ?? ""} ${clientProfile.nom ?? ""}`.trim() : "Un client";
      const officialEnd = client.mandate_official_end_date ?? "le jour 90";
      const refundProcessDate = client.mandate_official_end_date
        ? (() => { const d = new Date(client.mandate_official_end_date); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })()
        : "30 jours après la fin du mandat";

      dbAction = refundEligible ? "cancelled_with_refund" : "cancelled";

      // Notifications client — message différent selon qui déclenche (client lui-même vs staff)
      const staffLabel = staffTrust?.role === "admin" ? "Un administrateur" : "Votre agent";
      let clientTitle: string;
      let clientMsg: string;
      if (staffTrust) {
        if (refundEligible) {
          clientTitle = "💰 Remboursement initié pour vous";
          clientMsg = `${staffLabel} a effectué une demande de remboursement pour votre compte suite à votre demande (par téléphone ou email). Votre mandat reste actif jusqu'au ${officialEnd} et nous continuons à vous envoyer des offres. Le remboursement sera traité sous un délai de 30 jours après cette date (au plus tard le ${refundProcessDate}). Vous recevrez un email de confirmation dès que le virement sera émis.`;
        } else {
          clientTitle = "Mandat annulé";
          clientMsg = `${staffLabel} a annulé votre mandat de recherche pour votre compte (raison : ${reasonLabel(reason)}). Merci de votre confiance.`;
        }
      } else {
        clientTitle = refundEligible ? "✅ Remboursement confirmé" : "Mandat annulé";
        clientMsg = refundEligible
          ? `Nous avons bien reçu votre demande de remboursement. Elle a été validée automatiquement (jour ${daysSinceSignature} du mandat, seuil ≥ ${REFUND_ELIGIBILITY_DAY}). Votre mandat reste actif jusqu'au ${officialEnd} et nous continuons à vous envoyer des offres. Le remboursement sera traité sous un délai de 30 jours après cette date (au plus tard le ${refundProcessDate}). Vous recevrez un email de confirmation dès que le virement sera émis.`
          : reason === "found_alone"
            ? "Félicitations pour votre nouveau logement ! Votre mandat est annulé. (Non éligible au remboursement selon nos CGV)"
            : "Votre mandat de recherche a été annulé. Merci de votre confiance.";
      }
      await notify(supabase, client, "mandate_cancelled", clientTitle, clientMsg);

      // Notifications agent + admins
      await notifyAgent(supabase, client, "client_mandate_cancelled", "❌ Client annule son mandat", `${clientFullName} — Raison : ${reasonLabel(reason)}${refundEligible ? " — remboursement à traiter" : ""}.`);
      if (refundEligible) {
        await notifyAdmins(
          supabase,
          `💰 Demande de remboursement — ${clientFullName}`,
          `${clientFullName} (${clientProfile?.email ?? "email inconnu"}) a demandé son remboursement et a été automatiquement validé (jour ${daysSinceSignature} du mandat, raison : ${reasonLabel(reason)}). Le mandat se termine le ${officialEnd}. À traiter (virement) au plus tard le ${refundProcessDate}.`,
          client.id,
        );
      } else {
        await notifyAdmins(supabase, `❌ Mandat annulé — ${clientFullName}`, `${clientFullName} a annulé son mandat. Raison : ${reasonLabel(reason)}.`, client.id);
      }

      // Envoi email branded au CLIENT + copie (CC) à info@immo-rama.ch et à l'agent assigné
      try {
        const clientEmail = clientProfile?.email ?? null;
        const ccList: string[] = [ADMIN_EMAIL];
        if (client.agent_id) {
          const { data: agentRow } = await supabase
            .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
          if (agentRow?.user_id) {
            const { data: agentProfile } = await supabase
              .from("profiles").select("email").eq("id", agentRow.user_id).maybeSingle();
            if (agentProfile?.email) ccList.push(agentProfile.email);
          }
        }
        const initiator: "client" | "admin" | "agent" = staffTrust
          ? (staffTrust.role === "admin" ? "admin" : "agent")
          : "client";
        const { subject, html } = buildClientEmail({
          variant: refundEligible ? "refund" : "cancellation",
          initiator,
          firstName: clientProfile?.prenom ?? "",
          officialEnd: String(officialEnd),
          refundProcessDate: String(refundProcessDate),
          daysSinceSignature,
          reasonLabel: reasonLabel(reason),
          isTest: false,
        });
        if (clientEmail) {
          console.log("[mandate-renewal-action] sending branded email to client:", clientEmail, "cc:", ccList);
          await sendBrandedEmailResult(subject, html, [clientEmail], ccList);
        } else {
          // Pas d'email client connu : on envoie quand même au staff pour traçabilité
          console.warn("[mandate-renewal-action] no client email, sending to staff only");
          await sendBrandedEmailResult(subject, html, ccList, []);
        }
      } catch (e) {
        console.error("branded client email send failed:", e);
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
      triggered_by: staffTrust ? staffTrust.role : "client",
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

async function sendEmail(supabase: any, notificationId: string) {
  try {
    await supabase.functions.invoke("send-notification-email", {
      body: { notification_id: notificationId },
    });
  } catch (e) {
    console.error("send-notification-email failed:", e);
  }
}

async function notify(supabase: any, client: any, type: string, title: string, message: string) {
  if (!client.user_id) return;
  const { data } = await supabase.from("notifications").insert({
    user_id: client.user_id,
    type,
    title,
    message,
    link: "/client/mon-contrat",
    metadata: { client_id: client.id },
  }).select("id").single();
  if (data?.id) await sendEmail(supabase, data.id);
}

async function notifyAgent(supabase: any, client: any, type: string, title: string, message: string) {
  if (!client.agent_id) return;
  const { data: agent } = await supabase
    .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
  if (agent?.user_id) {
    const { data } = await supabase.from("notifications").insert({
      user_id: agent.user_id,
      type,
      title,
      message,
      link: "/agent/mes-clients",
      metadata: { client_id: client.id },
    }).select("id").single();
    if (data?.id) await sendEmail(supabase, data.id);
  }
}

async function notifyAdmins(supabase: any, title: string, message: string, clientId: string) {
  const { data: admins } = await supabase
    .from("user_roles").select("user_id").eq("role", "admin");
  for (const admin of admins ?? []) {
    const { data } = await supabase.from("notifications").insert({
      user_id: admin.user_id,
      type: "admin_mandate_update",
      title,
      message,
      link: "/admin/clients",
      metadata: { client_id: clientId },
    }).select("id").single();
    if (data?.id) await sendEmail(supabase, data.id);
  }
}


function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatDateFR(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Zurich" });
  } catch { return iso; }
}

interface ClientEmailParams {
  variant: "refund" | "cancellation";
  initiator: "client" | "admin" | "agent";
  firstName: string;
  officialEnd: string;
  refundProcessDate: string;
  daysSinceSignature: number;
  reasonLabel?: string;
  isTest: boolean;
}

function buildClientEmail(p: ClientEmailParams): { subject: string; html: string } {
  const PUBLIC_BASE_URL = "https://logisorama.ch";
  const logoUrl = `${PUBLIC_BASE_URL}/email/logo-immo-rama.png`;
  const dashboardUrl = `${PUBLIC_BASE_URL}/client/mon-contrat`;
  const firstNameSafe = p.firstName?.trim() ? escapeHtml(p.firstName.trim()) : "";
  const greeting = firstNameSafe ? `Bonjour ${firstNameSafe},` : "Bonjour,";
  const officialEndFR = formatDateFR(p.officialEnd);
  const refundDateFR = formatDateFR(p.refundProcessDate);

  const initiatorLabel =
    p.initiator === "admin" ? "un administrateur Logisorama" :
    p.initiator === "agent" ? "votre agent Logisorama" :
    "vous-même";

  let subject: string;
  let title: string;
  let bodyHtml: string;

  if (p.variant === "refund") {
    if (p.initiator === "client") {
      subject = `✅ Votre demande de remboursement a bien été reçue`;
      title = "Demande de remboursement bien reçue";
      bodyHtml = `
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#e8dfce;font-family:Arial,Helvetica,sans-serif;">${greeting}</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#f4ecd8;font-family:Arial,Helvetica,sans-serif;">Nous confirmons la bonne réception de <strong style="color:#E8C77E;">votre demande de remboursement</strong>. Elle a été validée automatiquement (jour ${p.daysSinceSignature} de votre mandat).</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;">Votre mandat reste <strong style="color:#E8C77E;">actif jusqu'au ${escapeHtml(officialEndFR)}</strong> et nous continuons à vous envoyer des offres pendant cette période. Profitez-en pleinement.</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;">Le remboursement sera versé sous un délai de <strong style="color:#E8C77E;">30 jours</strong> après la fin du mandat, soit au plus tard le <strong style="color:#E8C77E;">${escapeHtml(refundDateFR)}</strong>. Vous recevrez un email de confirmation dès que le virement sera émis.</p>`;
    } else {
      subject = `💰 Votre demande de remboursement est en cours de traitement`;
      title = "Votre remboursement est en cours";
      bodyHtml = `
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#e8dfce;font-family:Arial,Helvetica,sans-serif;">${greeting}</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#f4ecd8;font-family:Arial,Helvetica,sans-serif;">Suite à votre demande adressée à ${initiatorLabel}, nous avons enregistré pour votre compte une <strong style="color:#E8C77E;">demande de remboursement</strong> de votre acompte de mandat.</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;">Votre mandat reste <strong style="color:#E8C77E;">actif jusqu'au ${escapeHtml(officialEndFR)}</strong> et nous continuons à vous envoyer des offres pendant cette période. Profitez-en pour décrocher votre logement.</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;">Le remboursement sera versé sous un délai de <strong style="color:#E8C77E;">30 jours</strong> après la fin du mandat, soit au plus tard le <strong style="color:#E8C77E;">${escapeHtml(refundDateFR)}</strong>. Vous recevrez un email de confirmation dès que le virement sera émis.</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#8a7f6e;font-family:Arial,Helvetica,sans-serif;">Si cette demande ne correspond pas à votre intention, contactez-nous au plus vite à <a href="mailto:info@immo-rama.ch" style="color:#D4A853;text-decoration:underline;">info@immo-rama.ch</a>.</p>`;
    }
  } else {
    if (p.initiator === "client") {
      subject = `Confirmation de l'annulation de votre mandat`;
      title = "Annulation confirmée";
      bodyHtml = `
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#e8dfce;font-family:Arial,Helvetica,sans-serif;">${greeting}</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#f4ecd8;font-family:Arial,Helvetica,sans-serif;">Nous confirmons l'annulation de votre mandat de recherche${p.reasonLabel ? ` (raison : ${escapeHtml(p.reasonLabel)})` : ""}.</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;">Merci pour la confiance que vous nous avez accordée. L'équipe Logisorama reste à votre disposition si vous souhaitez reprendre vos recherches.</p>`;
    } else {
      subject = `Confirmation de l'annulation de votre mandat`;
      title = "Annulation de votre mandat";
      bodyHtml = `
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#e8dfce;font-family:Arial,Helvetica,sans-serif;">${greeting}</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#f4ecd8;font-family:Arial,Helvetica,sans-serif;">Suite à votre demande adressée à ${initiatorLabel}, votre mandat de recherche a été <strong style="color:#E8C77E;">annulé</strong>${p.reasonLabel ? ` (raison : ${escapeHtml(p.reasonLabel)})` : ""}.</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;">Merci pour la confiance que vous nous avez accordée. L'équipe Logisorama reste à votre disposition.</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#8a7f6e;font-family:Arial,Helvetica,sans-serif;">Si cette demande ne correspond pas à votre intention, contactez-nous au plus vite à <a href="mailto:info@immo-rama.ch" style="color:#D4A853;text-decoration:underline;">info@immo-rama.ch</a>.</p>`;
    }
  }

  const finalSubject = p.isTest ? `[TEST] ${subject}` : subject;

  const testBanner = p.isTest
    ? `<tr><td style="padding:18px 28px 0;">
         <div style="background:rgba(212,168,83,0.12);border:1px solid rgba(212,168,83,0.55);border-radius:10px;padding:12px 14px;color:#E8C77E;font-size:13px;line-height:1.55;font-family:Arial,Helvetica,sans-serif;">
           ⚠️ <strong>Aperçu de TEST</strong> — ceci est exactement l'email qui sera envoyé au client lors d'un envoi réel. Aucun mandat n'a été modifié.
         </div>
       </td></tr>`
    : "";

  const ctaPrimary = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;width:100%;max-width:340px;border-collapse:separate;">
      <tr>
        <td align="center" bgcolor="#D4A853" style="border-radius:10px;background:#D4A853;mso-padding-alt:16px 28px;box-shadow:0 6px 18px rgba(212,168,83,0.35);">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${dashboardUrl}" style="height:50px;v-text-anchor:middle;width:340px;" arcsize="20%" stroke="f" fillcolor="#D4A853">
            <w:anchorlock/>
            <center style="color:#1c1814;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Accéder à mon espace</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="${dashboardUrl}" target="_blank" style="display:block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.2;color:#1c1814;text-decoration:none;border-radius:10px;letter-spacing:0.3px;text-align:center;">Accéder à mon espace</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(finalSubject)}</title>
<style>
  @media only screen and (max-width: 600px) {
    .px-mobile { padding-left:20px !important; padding-right:20px !important; }
    .h1-mobile { font-size:22px !important; line-height:1.3 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#F5F5F0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(title)} — Logisorama</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F0;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:linear-gradient(180deg,#1c1814 0%,#231d18 100%);border-radius:14px;overflow:hidden;border:1px solid rgba(212,168,83,0.30);box-shadow:0 18px 50px rgba(0,0,0,0.22);">
      ${testBanner}
      <tr><td class="px-mobile" style="padding:32px 32px 12px;text-align:center;">
        <div style="margin:4px 0 18px;">
          <img src="${logoUrl}" alt="Immo-Rama" height="64" style="display:inline-block;height:64px;width:auto;max-width:160px;">
        </div>
        <h1 class="h1-mobile" style="margin:0 0 6px;font-size:26px;line-height:1.3;color:#f4ecd8;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(title)}</h1>
      </td></tr>
      <tr><td class="px-mobile" style="padding:10px 32px 6px;">
        ${bodyHtml}
      </td></tr>
      <tr><td class="px-mobile" style="padding:22px 32px 12px;">
        ${ctaPrimary}
      </td></tr>
      <tr><td class="px-mobile" style="padding:24px 32px 22px;color:#c9bfac;font-size:14px;line-height:1.7;font-family:Georgia,serif;font-style:italic;text-align:center;">
        L'équipe Logisorama<br/>Logisorama.ch By Immo-rama.ch
      </td></tr>
      <tr><td style="background:#0e0c0a;padding:22px 28px;text-align:center;border-top:1px solid rgba(212,168,83,0.18);">
        <div style="color:#8a7f6e;font-size:12px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
          <strong style="color:#c9a96a;">Immo-Rama.ch</strong> · CHE-442.303.796<br>
          Ch. de la Vignettaz 7 · 1023 Crissier · <a href="${PUBLIC_BASE_URL}" style="color:#D4A853;text-decoration:none;">logisorama.ch</a><br>
          <a href="mailto:info@immo-rama.ch" style="color:#D4A853;text-decoration:none;">info@immo-rama.ch</a>
        </div>
        <div style="margin-top:12px;color:#5a5246;font-size:11px;font-family:Arial,Helvetica,sans-serif;">
          Email transactionnel lié à votre mandat de recherche.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject: finalSubject, html };
}

async function sendBrandedEmailResult(
  subject: string,
  html: string,
  to: string[],
  cc: string[],
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    const msg = "RESEND_API_KEY missing";
    console.warn(msg);
    return { ok: false, error: msg };
  }
  const toUniq = Array.from(new Set(to.filter(Boolean)));
  const ccUniq = Array.from(new Set(cc.filter(Boolean))).filter((e) => !toUniq.includes(e));
  if (toUniq.length === 0) return { ok: false, error: "Aucun destinataire" };
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: STAFF_FROM,
    to: toUniq,
    cc: ccUniq.length > 0 ? ccUniq : undefined,
    subject,
    html,
  });
  if (error) {
    console.error("Resend branded email error:", error);
    return { ok: false, error: typeof error === "string" ? error : JSON.stringify(error) };
  }
  console.log("Branded email sent. to:", toUniq.join(", "), "cc:", ccUniq.join(", "), "id:", (data as any)?.id);
  return { ok: true };
}


