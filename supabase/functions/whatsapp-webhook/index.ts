// WhatsApp Cloud API Webhook
// GET: verification challenge
// POST: status updates + incoming messages + mandate lifecycle button replies
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppText, sendWhatsAppButtons } from "../_shared/whatsapp-send-text.ts";
import { forwardClientReplyToStaff } from "../_shared/whatsapp-forward-to-staff.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
function formatDateFR(isoDate: string | null | undefined): string {
  if (!isoDate) return "la date prévue";
  const [y, m, d] = isoDate.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return isoDate;
  return `${d} ${FR_MONTHS[m - 1]} ${y}`;
}

// =============================================================
// Mandate lifecycle button handler
// Returns true when the message was handled as a mandate button.
// =============================================================
async function handleMandateButton(
  supabase: ReturnType<typeof createClient>,
  args: { phoneE164: string; buttonText: string; buttonId: string },
): Promise<boolean> {
  const { phoneE164, buttonText, buttonId } = args;
  const txt = (buttonText || "").trim();
  const id = (buttonId || "").trim();

  // Pattern detection
  const isRenew = /renouveler/i.test(txt) || id === "mandate_renew";
  const isFoundAlone = /trouv[éee]\s*seul/i.test(txt) || id === "mandate_found_alone";
  const isCancelRefund = /annuler\s*&\s*remboursement|annuler.*remboursement/i.test(txt) || id === "mandate_cancel_refund";
  // Follow-up dialog buttons
  const isCancelNoRefundConfirm = id === "mandate_cancel_no_refund_yes" || /^oui.*annuler/i.test(txt);
  const isCancelNoRefundDecline = id === "mandate_cancel_no_refund_no" || /^non.*garder/i.test(txt);

  if (!isRenew && !isFoundAlone && !isCancelRefund && !isCancelNoRefundConfirm && !isCancelNoRefundDecline) {
    return false;
  }

  // Resolve client by phone
  const stripped = phoneE164.replace("+", "");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .or(`whatsapp_phone.eq.${phoneE164},telephone.eq.${phoneE164},whatsapp_phone.eq.${stripped},telephone.eq.${stripped}`)
    .maybeSingle();

  if (!profile) {
    console.log("Mandate button from unknown phone", phoneE164);
    return false;
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, statut, mandat_date_signature, mandate_pause_days, mandate_official_end_date")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!client) {
    console.log("No client for profile", profile.id);
    return false;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  async function callRenewal(action: string, extras: Record<string, any> = {}) {
    return await fetch(`${supabaseUrl}/functions/v1/mandate-renewal-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        action,
        triggered_by: "whatsapp_webhook",
        client_id: client.id,
        phone: phoneE164,
        ...extras,
      }),
    }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
  }

  // === RENEW ===
  if (isRenew) {
    const result = await callRenewal("renew");
    if (result?.ok) {
      await sendWhatsAppText(phoneE164, "✅ Votre mandat a bien été renouvelé pour 90 jours supplémentaires. Bonne continuation dans votre recherche !");
    } else {
      await sendWhatsAppText(phoneE164, `⚠️ Impossible de renouveler automatiquement : ${result?.error || "erreur"}. Un agent va vous contacter.`);
    }
    return true;
  }

  // === FOUND ALONE ===
  if (isFoundAlone) {
    const result = await callRenewal("cancel", { cancellation_reason: "found_alone" });
    if (result?.ok) {
      await sendWhatsAppText(phoneE164, "🎉 Félicitations pour votre nouveau logement ! Votre mandat est clôturé. Merci de votre confiance et bonne installation !");
    } else {
      await sendWhatsAppText(phoneE164, `⚠️ Erreur lors de la clôture : ${result?.error || "erreur"}. Un agent va vous contacter.`);
    }
    return true;
  }

  // === CANCEL & REFUND ===
  if (isCancelRefund) {
    // Compute eligibility
    const REFUND_DAY = 82;
    let daysSinceSignature = 0;
    if (client.mandat_date_signature) {
      const sig = new Date(client.mandat_date_signature);
      daysSinceSignature = Math.max(0, Math.floor((Date.now() - sig.getTime()) / 86400000) - (client.mandate_pause_days ?? 0));
    }

    if (daysSinceSignature >= REFUND_DAY) {
      const result = await callRenewal("cancel_with_refund", { cancellation_reason: "searching_alone" });
      if (result?.ok) {
        const endDate = formatDateFR(client.mandate_official_end_date);
        await sendWhatsAppText(phoneE164, `💰 Demande de remboursement enregistrée. Votre mandat reste actif jusqu'au ${endDate}. Le remboursement sera traité sous 30 jours après cette date.`);
      } else {
        await sendWhatsAppText(phoneE164, `⚠️ Erreur lors de la demande : ${result?.error || "erreur"}. Un agent va vous contacter.`);
      }
    } else {
      // Fallback dialog: not eligible yet
      await supabase.from("whatsapp_pending_actions").insert({
        recipient_phone: phoneE164,
        client_id: client.id,
        action_type: "cancel_no_refund_dialog",
        context_json: { days_since_signature: daysSinceSignature },
      });
      const remaining = Math.max(0, 90 - daysSinceSignature);
      await sendWhatsAppButtons(
        phoneE164,
        `⚠️ Le remboursement est disponible uniquement après 90 jours de recherche active (vous êtes au jour ${daysSinceSignature}, encore ${remaining} jour${remaining > 1 ? "s" : ""}).\n\nSouhaitez-vous quand même annuler votre mandat *sans remboursement* ?`,
        [
          { id: "mandate_cancel_no_refund_yes", title: "Oui, annuler" },
          { id: "mandate_cancel_no_refund_no", title: "Non, garder" },
        ],
      );
    }
    return true;
  }

  // === CONFIRM CANCEL WITHOUT REFUND ===
  if (isCancelNoRefundConfirm) {
    const result = await callRenewal("cancel", { cancellation_reason: "searching_alone" });
    if (result?.ok) {
      await sendWhatsAppText(phoneE164, "✅ Votre mandat a été annulé. Bonne continuation dans vos recherches.");
      // Mark pending dialog consumed
      await supabase
        .from("whatsapp_pending_actions")
        .update({ consumed_at: new Date().toISOString() })
        .eq("recipient_phone", phoneE164)
        .eq("action_type", "cancel_no_refund_dialog")
        .is("consumed_at", null);
    } else {
      await sendWhatsAppText(phoneE164, `⚠️ Erreur : ${result?.error || "erreur"}. Un agent va vous contacter.`);
    }
    return true;
  }

  // === DECLINE CANCEL ===
  if (isCancelNoRefundDecline) {
    const endDate = formatDateFR(client.mandate_official_end_date);
    await sendWhatsAppText(phoneE164, `✅ Très bien, votre mandat reste actif jusqu'au ${endDate}. Nous continuons nos recherches pour vous !`);
    await supabase
      .from("whatsapp_pending_actions")
      .update({ consumed_at: new Date().toISOString() })
      .eq("recipient_phone", phoneE164)
      .eq("action_type", "cancel_no_refund_dialog")
      .is("consumed_at", null);
    return true;
  }

  return false;
}

// =============================================================
// Lifecycle button handler (visit, post-visit, application, keys, review)
// =============================================================
async function handleLifecycleButton(
  supabase: ReturnType<typeof createClient>,
  args: { phoneE164: string; buttonText: string; buttonId: string },
): Promise<boolean> {
  const { phoneE164, buttonText, buttonId } = args;
  const txt = (buttonText || "").toLowerCase().trim();
  const id = (buttonId || "").trim();

  // Pattern detection
  const isVisitYes = id === "visit_propose_yes" || /^oui.*(visite|particip)/i.test(txt) || txt === "oui, je participe" || txt === "je participe";
  const isVisitNo = id === "visit_propose_no" || /^non.*(visite|merci)/i.test(txt) || txt === "non merci";
  const isPostulate = id === "post_visit_postuler" || /postul|d[eé]poser.*candidature/i.test(txt);
  const isRefuseAfterVisit = id === "post_visit_refuser" || (txt.startsWith("non") && txt.includes("merci"));
  const isAppValidate = id === "application_validate" || /^je valide|^oui.*signer/i.test(txt);
  const isAppRefuse = id === "application_refuse" || /^je refuse/i.test(txt);
  const isKeysReceived = id === "keys_received" || /re[çc]u.*cl[eé]/i.test(txt);
  const isKeysNotYet = id === "keys_not_yet" || /pas encore/i.test(txt);
  const isReviewLater = id === "review_later" || /plus tard/i.test(txt);

  if (!isVisitYes && !isVisitNo && !isPostulate && !isRefuseAfterVisit
      && !isAppValidate && !isAppRefuse && !isKeysReceived && !isKeysNotYet && !isReviewLater) {
    return false;
  }

  // Resolve client
  const stripped = phoneE164.replace("+", "");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, prenom, nom, telephone")
    .or(`whatsapp_phone.eq.${phoneE164},telephone.eq.${phoneE164},whatsapp_phone.eq.${stripped},telephone.eq.${stripped}`)
    .maybeSingle();
  if (!profile) return false;

  const { data: client } = await supabase
    .from("clients")
    .select("id, agent_id")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!client) return false;

  const clientName = `${profile.prenom || ""} ${profile.nom || ""}`.trim() || "Client";

  // === VISIT YES/NO (response to template #3) ===
  if (isVisitYes || isVisitNo) {
    // Find latest proposed visit for this client
    const { data: visite } = await supabase
      .from("visites")
      .select("id, adresse, date_visite")
      .eq("client_id", client.id)
      .eq("statut", "proposee")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newStatut = isVisitYes ? "planifiee" : "annulee";
    const reponse = isVisitYes ? "✅ Accepte" : "❌ Refuse";

    if (visite) {
      await supabase.from("visites").update({ statut: newStatut }).eq("id", visite.id);
    }

    await sendWhatsAppText(phoneE164, isVisitYes
      ? "✅ Parfait ! Votre visite est confirmée. Vous recevrez un rappel 24h avant."
      : "Bien noté, visite annulée. Votre agent vous proposera d'autres biens prochainement.");

    // Forward to agent + admin via template #4
    await forwardClientReplyToStaff({
      supabase,
      clientId: client.id,
      agentId: client.agent_id,
      summary: `${reponse} — visite ${visite?.adresse || ""}`,
      templateKey: "alerte_agent_reponse_visite",
      variables: [
        clientName,
        visite?.adresse || "—",
        visite?.date_visite ? new Date(visite.date_visite).toLocaleString("fr-CH", { timeZone: "Europe/Zurich" }) : "—",
        reponse,
        profile.telephone || phoneE164,
      ],
      notifTitle: "📅 Réponse client à proposition de visite",
      notifLink: "/agent/visites",
    });
    return true;
  }

  // === POST-VISITE: POSTULER / REFUSER ===
  if (isPostulate || isRefuseAfterVisit) {
    // Find latest visite effectuee for this client (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: visite } = await supabase
      .from("visites")
      .select("id, offre_id, adresse")
      .eq("client_id", client.id)
      .eq("statut", "effectuee")
      .gte("date_visite", sevenDaysAgo)
      .order("date_visite", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isPostulate) {
      await sendWhatsAppText(phoneE164, "✅ Parfait ! Votre demande est transmise à votre agent qui finalisera le dossier.");
      // Get agent name for client confirmation template
      let agentName = "votre agent";
      if (client.agent_id) {
        const { data: ag } = await supabase.from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
        if (ag?.user_id) {
          const { data: ap } = await supabase.from("profiles").select("prenom").eq("id", ag.user_id).maybeSingle();
          if (ap?.prenom) agentName = ap.prenom;
        }
      }

      // Send confirmation #7 to client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          event_type: "candidature_demandee_client",
          template_key: "candidature_demandee_client",
          client_id: client.id,
          variables: [profile.prenom || "Client", visite?.adresse || "—", agentName],
        }),
      }).catch(() => {});

      // Forward to agent + admin via template #9
      await forwardClientReplyToStaff({
        supabase,
        clientId: client.id,
        agentId: client.agent_id,
        summary: `🎯 ${clientName} veut postuler pour ${visite?.adresse || "ce bien"}`,
        templateKey: "alerte_agent_candidature",
        variables: [clientName, visite?.adresse || "—", "https://logisorama.ch/agent/deposer-candidature"],
        notifTitle: "🎯 Nouvelle demande de candidature client",
        notifLink: "/agent/deposer-candidature",
      });
    } else {
      // Send #8 refus
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          event_type: "candidature_refus_client",
          template_key: "candidature_refus_client",
          client_id: client.id,
          variables: [profile.prenom || "Client", visite?.adresse || "—"],
        }),
      }).catch(() => {});

      await forwardClientReplyToStaff({
        supabase,
        clientId: client.id,
        agentId: client.agent_id,
        summary: `❌ ${clientName} ne souhaite pas postuler pour ${visite?.adresse || "ce bien"}`,
        notifTitle: "Client ne postule pas après visite",
        notifLink: "/agent/visites",
      });
    }
    return true;
  }

  // === APPLICATION VALIDATE / REFUSE ===
  if (isAppValidate || isAppRefuse) {
    const { data: candidature } = await supabase
      .from("candidatures")
      .select("id, offre_id")
      .eq("client_id", client.id)
      .eq("agent_valide_regie", true)
      .order("agent_valide_regie_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (candidature) {
      if (isAppValidate) {
        await supabase
          .from("candidatures")
          .update({ client_accepte_conclure: true, client_accepte_conclure_at: new Date().toISOString(), statut: "bail_conclu" })
          .eq("id", candidature.id);
        await sendWhatsAppText(phoneE164, "🎉 Parfait ! Votre agent va organiser la signature du bail. Vous recevrez la date par WhatsApp.");
      } else {
        await supabase.from("candidatures").update({ statut: "refusee" }).eq("id", candidature.id);
        await sendWhatsAppText(phoneE164, "Refus enregistré. Votre agent vous contactera pour la suite.");
      }
    }

    await forwardClientReplyToStaff({
      supabase,
      clientId: client.id,
      agentId: client.agent_id,
      summary: isAppValidate
        ? `✅ ${clientName} valide le dossier accepté par la régie`
        : `❌ ${clientName} refuse le dossier accepté`,
      notifTitle: isAppValidate ? "✅ Client valide la signature" : "❌ Client refuse le dossier",
      notifLink: "/agent/candidatures",
    });
    return true;
  }

  // === KEYS RECEIVED / NOT YET ===
  if (isKeysReceived || isKeysNotYet) {
    const { data: candidature } = await supabase
      .from("candidatures")
      .select("id")
      .eq("client_id", client.id)
      .eq("cles_remises", true)
      .order("cles_remises_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isKeysReceived && candidature) {
      await supabase
        .from("candidatures")
        .update({ cles_recues_confirme: true, cles_recues_confirme_at: new Date().toISOString() })
        .eq("id", candidature.id);
      await sendWhatsAppText(phoneE164, "🎊 Bienvenue dans votre nouveau chez-vous ! Toute l'équipe Logisorama vous souhaite une excellente installation.");
    } else if (isKeysNotYet) {
      await sendWhatsAppText(phoneE164, "⚠️ Bien noté. Votre agent va vous contacter en priorité pour résoudre la situation.");
    }

    await forwardClientReplyToStaff({
      supabase,
      clientId: client.id,
      agentId: client.agent_id,
      summary: isKeysReceived
        ? `✅ ${clientName} confirme avoir reçu les clés`
        : `⚠️ URGENT — ${clientName} n'a PAS encore reçu les clés`,
      notifTitle: isKeysReceived ? "✅ Clés confirmées par client" : "⚠️ URGENT — Clés non reçues",
      notifLink: "/agent/candidatures",
    });
    return true;
  }

  // === REVIEW LATER ===
  if (isReviewLater) {
    await sendWhatsAppText(phoneE164, "Pas de souci ! On vous renverra le lien dans une semaine. Merci 🙏");
    return true;
  }

  return false;
}

async function verifyMetaSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !header.startsWith("sha256=")) return false;
  const sigHex = header.slice(7).toLowerCase();
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const macBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(macBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (expected.length !== sigHex.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sigHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);

  // ---------- Verification (GET) ----------
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token === expected && challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  // ---------- Events (POST) ----------
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  // Read raw body first (needed for HMAC verification)
  const rawBody = await req.text();

  // ---------- HMAC X-Hub-Signature-256 verification ----------
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (appSecret) {
    const sigHeader = req.headers.get("x-hub-signature-256");
    const ok = await verifyMetaSignature(rawBody, sigHeader, appSecret);
    if (!ok) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    console.warn("whatsapp-webhook: HMAC verification disabled (WHATSAPP_APP_SECRET not set)");
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("bad json", { status: 400, headers: corsHeaders });
  }

  try {
    const entries = body?.entry || [];
    for (const entry of entries) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {};

        // Statuses (sent, delivered, read, failed)
        for (const st of value.statuses || []) {
          const metaId = st.id;
          const status = st.status; // sent | delivered | read | failed
          if (!metaId || !status) continue;

          const update: Record<string, any> = { status };
          const ts = st.timestamp ? new Date(parseInt(st.timestamp) * 1000).toISOString() : new Date().toISOString();
          if (status === "delivered") update.delivered_at = ts;
          if (status === "read") update.read_at = ts;
          if (status === "failed") {
            update.failed_at = ts;
            update.error_message = JSON.stringify(st.errors || []).slice(0, 1000);
          }
          if (status === "sent") update.sent_at = update.sent_at ?? ts;

          await supabase
            .from("whatsapp_notification_logs")
            .update(update)
            .eq("meta_message_id", metaId);
        }

        // Incoming messages from clients
        for (const msg of value.messages || []) {
          const fromPhone = msg.from; // E.164 sans +
          const phoneE164 = `+${fromPhone}`;

          // Detect button replies (template quick reply OR interactive button reply)
          const buttonText: string | undefined =
            msg.button?.text ||
            msg.interactive?.button_reply?.title;
          const buttonId: string | undefined = msg.interactive?.button_reply?.id;

          // ============= MANDATE + LIFECYCLE BUTTONS =============
          if (buttonText || buttonId) {
            const handledMandate = await handleMandateButton(supabase, {
              phoneE164, buttonText: buttonText || "", buttonId: buttonId || "",
            });
            if (handledMandate) continue;
            const handledLifecycle = await handleLifecycleButton(supabase, {
              phoneE164, buttonText: buttonText || "", buttonId: buttonId || "",
            });
            if (handledLifecycle) continue;
          }

          const text = msg.text?.body || buttonText || "[Pièce jointe WhatsApp]";

          // Trouver le profile via téléphone
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .or(`whatsapp_phone.eq.+${fromPhone},telephone.eq.+${fromPhone},whatsapp_phone.eq.${fromPhone},telephone.eq.${fromPhone}`)
            .maybeSingle();

          if (!profile) {
            console.log("Incoming WA from unknown phone", fromPhone);
            continue;
          }

          // Trouver le client + agent
          const { data: client } = await supabase
            .from("clients")
            .select("id, agent_id")
            .eq("user_id", profile.id)
            .maybeSingle();

          if (!client?.agent_id) continue;

          const { data: agent } = await supabase
            .from("agents")
            .select("user_id")
            .eq("id", client.agent_id)
            .maybeSingle();

          if (!agent?.user_id) continue;

          // Chercher conversation existante
          const { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .eq("client_id", client.id.toString())
            .eq("agent_id", client.agent_id.toString())
            .maybeSingle();

          let conversationId = conv?.id;
          if (!conversationId) {
            const { data: newConv } = await supabase
              .from("conversations")
              .insert({
                client_id: client.id.toString(),
                agent_id: client.agent_id.toString(),
                subject: "WhatsApp",
                conversation_type: "client-agent",
              })
              .select("id")
              .single();
            conversationId = newConv?.id;
          }

          if (conversationId) {
            await supabase.from("messages").insert({
              conversation_id: conversationId,
              sender_id: profile.id,
              content: `📱 [WhatsApp] ${text}`,
            });

            // Notification interne pour l'agent
            await supabase.rpc("create_notification", {
              p_user_id: agent.user_id,
              p_type: "whatsapp_reply",
              p_title: "📱 Réponse WhatsApp client",
              p_message: text.slice(0, 200),
              p_link: "/agent/messagerie",
              p_data: { conversation_id: conversationId },
            }).then(() => {}).catch(() => {});
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("whatsapp-webhook error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
