// WhatsApp Cloud API Webhook
// GET: verification challenge
// POST: status updates + incoming messages + mandate lifecycle button replies
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppText, sendWhatsAppButtons } from "../_shared/whatsapp-send-text.ts";

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

          // ============= MANDATE LIFECYCLE BUTTONS =============
          if (buttonText || buttonId) {
            const handled = await handleMandateButton(supabase, {
              phoneE164,
              buttonText: buttonText || "",
              buttonId: buttonId || "",
            });
            if (handled) continue; // skip default messaging flow
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
