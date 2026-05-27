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

      // === Mode TEST email staff (non destructif) ===
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
        const clientFullName = cliProfile ? `${cliProfile.prenom ?? ""} ${cliProfile.nom ?? ""}`.trim() : "Client test";

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
        const subject = `[TEST] 💰 Remboursement à traiter — ${clientFullName}`;
        const html = `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
            <div style="background:#fef3c7;border:1px solid #f59e0b;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">
              ⚠️ <strong>Ceci est un email de TEST</strong> — aucun mandat n'a été modifié.
            </div>
            <h2 style="margin:0 0 16px">${subject}</h2>
            <p><strong>Client :</strong> ${clientFullName}${cliProfile?.email ? ` (${cliProfile.email})` : ""}</p>
            <p><strong>Action :</strong> Remboursement demandé</p>
            <p><strong>Raison :</strong> Je continue mes recherches seul</p>
            <p><strong>Origine :</strong> Initiée par un administrateur</p>
            <p><strong>Jour du mandat :</strong> 82</p>
            <p><strong>Fin officielle du mandat :</strong> ${officialEnd}<br/><strong>Virement à traiter au plus tard le :</strong> ${refundProcessDate}</p>
            <p style="margin-top:24px"><a href="https://logisorama.ch/admin/clients" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Voir la fiche client</a></p>
          </div>`;

        console.log("[TEST staff email] recipients calculés:", recipients);
        const result = await sendStaffEmailResult(subject, html, recipients);
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

      // Envoi email direct staff (info@immo-rama.ch + agent assigné)
      try {
        const recipients: string[] = [ADMIN_EMAIL];
        if (client.agent_id) {
          const { data: agentRow } = await supabase
            .from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
          if (agentRow?.user_id) {
            const { data: agentProfile } = await supabase
              .from("profiles").select("email").eq("id", agentRow.user_id).maybeSingle();
            if (agentProfile?.email) recipients.push(agentProfile.email);
          }
        }
        const origin = staffTrust
          ? (staffTrust.role === "admin" ? "Initiée par un administrateur" : "Initiée par l'agent en charge")
          : "Demande client (depuis l'application)";
        const subject = refundEligible
          ? `💰 Remboursement à traiter — ${clientFullName}`
          : `❌ Mandat annulé — ${clientFullName}`;
        const refundBlock = refundEligible
          ? `<p><strong>Fin officielle du mandat :</strong> ${officialEnd}<br/><strong>Virement à traiter au plus tard le :</strong> ${refundProcessDate}</p>`
          : "";
        const html = `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 16px">${subject}</h2>
            <p><strong>Client :</strong> ${clientFullName}${clientProfile?.email ? ` (${clientProfile.email})` : ""}</p>
            <p><strong>Action :</strong> ${refundEligible ? "Remboursement demandé" : "Mandat annulé"}</p>
            <p><strong>Raison :</strong> ${reasonLabel(reason)}</p>
            <p><strong>Origine :</strong> ${origin}</p>
            <p><strong>Jour du mandat :</strong> ${daysSinceSignature}</p>
            ${refundBlock}
            <p style="margin-top:24px"><a href="https://logisorama.ch/admin/clients" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Voir la fiche client</a></p>
          </div>`;
        await sendStaffEmail(subject, html, recipients);
      } catch (e) {
        console.error("staff email send failed:", e);
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


async function sendStaffEmail(subject: string, html: string, recipients: string[]) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY missing — skipping staff email");
    return;
  }
  const uniq = Array.from(new Set(recipients.filter(Boolean)));
  if (uniq.length === 0) return;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: STAFF_FROM,
    to: uniq,
    subject,
    html,
  });
  if (error) console.error("Resend staff email error:", error);
  else console.log("Staff email sent to:", uniq.join(", "));
}
