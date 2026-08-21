// WhatsApp Cloud API Webhook
// GET: verification challenge
// POST: status updates + incoming messages + mandate lifecycle button replies
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppText, sendWhatsAppButtons } from "../_shared/whatsapp-send-text.ts";
import { forwardClientReplyToStaff } from "../_shared/whatsapp-forward-to-staff.ts";
import { resolveClientProfileByPhone } from "../_shared/resolve-profile-by-phone.ts";

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
  const isVisitYes = id === "visit_propose_yes" || /^oui.*(visite|particip)/i.test(txt) || txt === "oui, je participe" || txt === "je participe" || txt === "je confirme" || id === "visit_propose_confirm";
  const isVisitNo = id === "visit_propose_no" || id === "visit_propose_unavailable" || /indisponible/i.test(txt) || /^non.*(visite|merci)/i.test(txt) || txt === "non merci";
  const isVisitDelegate = id === "visit_propose_delegate" || /d[ée]l[ée]gu/i.test(txt);
  const isPostulate = id === "post_visit_postuler" || /postul|d[eé]poser.*candidature/i.test(txt);
  const isRefuseAfterVisit = id === "post_visit_refuser" || (txt.startsWith("non") && txt.includes("merci"));
  const isAppValidate = id === "application_validate" || /^je valide|^oui.*signer/i.test(txt);
  const isAppRefuse = id === "application_refuse" || /^je refuse/i.test(txt);
  const isKeysReceived = id === "keys_received" || /re[çc]u.*cl[eé]/i.test(txt);
  const isKeysNotYet = id === "keys_not_yet" || /pas encore/i.test(txt);
  const isReviewLater = id === "review_later" || /plus tard/i.test(txt);

  if (!isVisitYes && !isVisitNo && !isVisitDelegate && !isPostulate && !isRefuseAfterVisit
      && !isAppValidate && !isAppRefuse && !isKeysReceived && !isKeysNotYet && !isReviewLater) {
    return false;
  }

  // Resolve client (handles ambiguous duplicate phones)
  const profile = await resolveClientProfileByPhone(supabase, phoneE164);
  if (!profile) {
    console.warn("[handleLifecycleButton] no profile for phone", phoneE164);
    return false;
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, agent_id")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!client) return false;

  const clientName = `${profile.prenom || ""} ${profile.nom || ""}`.trim() || "Client";

  // === VISIT YES / NO / DELEGATE (response to template proposition_visite_client) ===
  if (isVisitYes || isVisitNo || isVisitDelegate) {
    // Find latest proposed visit for this client
    const { data: visite } = await supabase
      .from("visites")
      .select("id, adresse, date_visite, offre_id")
      .eq("client_id", client.id)
      .eq("statut", "proposee")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let newStatut = "annulee";
    let reponse = "❌ Refuse";
    let clientReply = "Bien noté, visite annulée. Votre agent vous proposera d'autres créneaux.";
    let notifTitle = "📅 Réponse client à proposition de visite";

    if (isVisitYes) {
      newStatut = "planifiee";
      reponse = "✅ Accepte";
      clientReply = "✅ Parfait ! Votre visite est confirmée. Vous recevrez un rappel 24h avant.";
    } else if (isVisitDelegate) {
      newStatut = "a_deleguer";
      reponse = "🛵 Déléguée (coursier)";
      clientReply = "✅ Bien noté ! Un coursier s'y rend pour vous et vous enverra photos + vidéo + compte-rendu.";
      notifTitle = "🛵 Visite à déléguer (coursier)";
    } else {
      reponse = "❌ Indisponible";
    }

    if (visite) {
      if (isVisitDelegate) {
        await supabase
          .from("visites")
          .update({ est_deleguee: true, statut: "deleguee", statut_coursier: "a_assigner" })
          .eq("id", visite.id);
      } else {
        await supabase.from("visites").update({ statut: newStatut }).eq("id", visite.id);
      }
    }

    await sendWhatsAppText(phoneE164, clientReply);

    // Load offre details for the 8-var template
    let offre: any = null;
    if (visite?.offre_id) {
      const { data: o } = await supabase
        .from("offres")
        .select("pieces, surface, adresse, prix, lien_annonce")
        .eq("id", visite.offre_id)
        .maybeSingle();
      offre = o;
    }

    const fmtPrix = (n: any) => {
      if (n == null || n === "") return "—";
      const num = typeof n === "string" ? parseFloat(n) : n;
      if (!isFinite(num)) return String(n);
      return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    };
    const creneau = visite?.date_visite
      ? new Date(visite.date_visite).toLocaleString("fr-CH", { timeZone: "Europe/Zurich", dateStyle: "short", timeStyle: "short" })
      : "—";

    // Forward to agent + admin via template alerte_agent_reponse_visite (8 vars)
    await forwardClientReplyToStaff({
      supabase,
      clientId: client.id,
      agentId: client.agent_id,
      summary: `${reponse} — visite ${offre?.adresse || visite?.adresse || ""}`,
      templateKey: "alerte_agent_reponse_visite",
      variables: [
        clientName,                                  // {{1}} client
        String(offre?.pieces ?? "—"),                // {{2}} pièces
        String(offre?.surface ?? "—"),               // {{3}} surface
        offre?.adresse || visite?.adresse || "—",    // {{4}} adresse
        fmtPrix(offre?.prix),                        // {{5}} prix
        creneau,                                     // {{6}} créneau
        reponse,                                     // {{7}} réponse
        offre?.lien_annonce || "Sur demande",        // {{8}} lien annonce
      ],
      notifTitle,
      notifLink: "/agent/visites",
          excludePhone: phoneE164,
      });
    return true;
  }

  // === POST-VISITE: POSTULER / REFUSER ===
  if (isPostulate || isRefuseAfterVisit) {
    // Find latest visite effectuee for this client (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: visite } = await supabase
      .from("visites")
      .select("id, offre_id, adresse, date_visite")
      .eq("client_id", client.id)
      .eq("statut", "effectuee")
      .gte("date_visite", sevenDaysAgo)
      .order("date_visite", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isPostulate) {
      // Mark visit as confirmed by client (implicit confirmation via WA Postuler)
      if (visite?.id) {
        await supabase.from("visites")
          .update({ client_confirme_visite_at: new Date().toISOString() })
          .eq("id", visite.id);
      }
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

      // Load offre details for proper templates
      let offre: any = null;
      if (visite?.offre_id) {
        const { data: o } = await supabase.from("offres")
          .select("pieces, surface, adresse, prix, lien_annonce")
          .eq("id", visite.offre_id).maybeSingle();
        offre = o;
      }
      const { data: clientFull } = await supabase
        .from("clients").select("gerance_actuelle").eq("id", client.id).maybeSingle();
      const regieNom = clientFull?.gerance_actuelle || "Régie";
      const fmtPrix = (n: any) => {
        if (n == null || n === "") return "—";
        const num = typeof n === "string" ? parseFloat(n) : n;
        if (!isFinite(num)) return String(n);
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
      };
      const visiteDateFR = visite?.date_visite
        ? new Date(visite.date_visite).toLocaleDateString("fr-CH", { timeZone: "Europe/Zurich", day: "numeric", month: "long", year: "numeric" })
        : "—";
      const adresse = offre?.adresse || visite?.adresse || "—";

      // Send confirmation #6 to client (8 vars: prenom, pieces, surface, adresse, prix, regie, lien, agent)
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          event_type: "candidature_demandee_client",
          template_key: "candidature_demandee_client",
          client_id: client.id,
          variables: [
            profile.prenom || "Client",
            String(offre?.pieces ?? "—"),
            String(offre?.surface ?? "—"),
            adresse,
            fmtPrix(offre?.prix),
            regieNom,
            offre?.lien_annonce || "Sur demande",
            agentName,
          ],
        }),
      }).catch(() => {});

      // Forward to agent + admin via T16 alerte_agent_candidature (8 vars)
      await forwardClientReplyToStaff({
        supabase,
        clientId: client.id,
        agentId: client.agent_id,
        summary: `🎯 ${clientName} veut postuler pour ${adresse}`,
        templateKey: "alerte_agent_candidature",
        variables: [
          clientName,
          String(offre?.pieces ?? "—"),
          String(offre?.surface ?? "—"),
          adresse,
          fmtPrix(offre?.prix),
          visiteDateFR,
          regieNom,
          offre?.lien_annonce || "Sur demande",
        ],
        notifTitle: "🎯 Nouvelle demande de candidature client",
        notifLink: "/agent/deposer-candidature",
        excludePhone: phoneE164,
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
              excludePhone: phoneE164,
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
          excludePhone: phoneE164,
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
          excludePhone: phoneE164,
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

// =============================================================
// NEW QR Buttons handler (T2-T16 + agent-side payloads)
// Covers: new_offer_visit_request, visit_propose_delegate,
// visit_remind_confirm/delegate/cancel, post_visit_apply_yes/maybe/no,
// candidature_question, application_thanks, edl_reschedule, referral_start,
// agent_message_callback, agent_call_client_now, agent_dispatch_courier,
// agent_candidature_taken
// =============================================================
async function handleNewQRButtons(
  supabase: ReturnType<typeof createClient>,
  args: { phoneE164: string; buttonText: string; buttonId: string },
): Promise<boolean> {
  const { phoneE164, buttonId } = args;
  const id = (buttonId || "").trim();
  const KNOWN = new Set([
    "new_offer_visit_request",
    "visit_propose_delegate",
    "visit_remind_confirm", "visit_remind_delegate", "visit_remind_cancel",
    "post_visit_apply_yes", "post_visit_apply_maybe", "post_visit_apply_no",
    "candidature_question", "application_thanks", "edl_reschedule", "referral_start",
    "agent_message_callback", "agent_call_client_now", "agent_dispatch_courier",
    "agent_candidature_taken",
  ]);
  if (!KNOWN.has(id)) return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const profile = await resolveClientProfileByPhone(supabase, phoneE164);
  if (!profile) {
    console.log("[handleNewQRButtons] unknown phone", phoneE164);
    return false;
  }

  // Try resolve client (most payloads). Agent-side payloads tolerate missing client.
  const { data: client } = await supabase
    .from("clients")
    .select("id, agent_id")
    .eq("user_id", profile.id)
    .maybeSingle();

  // Try resolve agent (agent-side payloads)
  let agentRow: { id: string; user_id: string } | null = null;
  {
    const { data: ag } = await supabase
      .from("agents")
      .select("id, user_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (ag) agentRow = ag as any;
  }

  const clientName = `${profile.prenom || ""} ${profile.nom || ""}`.trim() || "Client";
  const ack = (txt: string) => sendWhatsAppText(phoneE164, txt);
  const notifyAgent = async (agentUserId: string, title: string, message: string, link = "/agent/visites") => {
    await supabase.rpc("create_notification", {
      p_user_id: agentUserId,
      p_type: "whatsapp_action",
      p_title: title,
      p_message: message.slice(0, 250),
      p_link: link,
      p_metadata: {},
    }).then(() => {}).catch(() => {});
  };
  const callForward = async (summary: string, notifTitle: string, notifLink: string) => {
    if (!client) return;
    await forwardClientReplyToStaff({
      supabase,
      clientId: client.id,
      agentId: client.agent_id,
      summary,
      notifTitle,
      notifLink,
          excludePhone: phoneE164,
      }).catch((e) => console.error("forward failed", e));
  };

  // Lookup latest visite with offre context
  const latestVisite = async (statuts: string[]) => {
    if (!client) return null;
    const { data } = await supabase
      .from("visites")
      .select("id, offre_id, adresse, date_visite, statut")
      .eq("client_id", client.id)
      .in("statut", statuts)
      .order("date_visite", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  };

  switch (id) {
    // ---- T2 new_offer ----
    case "new_offer_visit_request": {
      await ack("✅ Bien noté ! Votre agent va vous proposer un créneau de visite très vite.");
      await callForward(
        `🙋 ${clientName} demande une visite (depuis nouvelle offre)`,
        "🙋 Demande de visite client",
        "/agent/offres",
      );
      return true;
    }

    // ---- T3 visit_propose_delegate ----
    case "visit_propose_delegate": {
      const v = await latestVisite(["proposee"]);
      if (v) {
        await supabase
          .from("visites")
          .update({ est_deleguee: true, statut: "deleguee", statut_coursier: "a_assigner" })
          .eq("id", v.id);
      }
      await ack("🎥 Parfait ! Un coursier va se rendre à la visite à votre place et vous enverra photos + vidéo + compte-rendu. On vous tient au courant !");
      await callForward(
        `🎥 ${clientName} délègue la visite ${v?.adresse || ""} → coursier à assigner`,
        "🎥 Visite déléguée — coursier à assigner",
        "/agent/visites",
      );
      return true;
    }

    // ---- T4 visit_remind_confirm ----
    case "visit_remind_confirm": {
      const v = await latestVisite(["planifiee", "confirmee"]);
      if (v) {
        await supabase.from("visites").update({ statut: "confirmee" }).eq("id", v.id);
      }
      await ack("✅ Présence confirmée. À demain ! 🤝");
      return true;
    }

    // ---- T4 visit_remind_delegate ----
    case "visit_remind_delegate": {
      const v = await latestVisite(["planifiee", "confirmee", "proposee"]);
      if (v) {
        await supabase
          .from("visites")
          .update({ est_deleguee: true, statut: "deleguee", statut_coursier: "a_assigner" })
          .eq("id", v.id);
      }
      await ack("🎥 Coursier en cours d'assignation. Vous recevrez photos + vidéo + compte-rendu juste après la visite.");
      await callForward(
        `🎥 URGENT ${clientName} délègue visite J-1 (${v?.adresse || ""})`,
        "🎥 URGENT — Visite déléguée J-1",
        "/agent/visites",
      );
      return true;
    }

    // ---- T4 visit_remind_cancel ----
    case "visit_remind_cancel": {
      const v = await latestVisite(["planifiee", "confirmee", "proposee"]);
      if (v) {
        await supabase.from("visites").update({ statut: "annulee" }).eq("id", v.id);
      }
      await ack("Bien noté, visite annulée. Votre agent prendra contact pour la suite.");
      await callForward(
        `❌ ${clientName} annule visite J-1 (${v?.adresse || ""})`,
        "❌ Annulation visite J-1",
        "/agent/visites",
      );
      return true;
    }

    // ---- T5 post_visit_apply_yes (= post_visit_postuler) ----
    case "post_visit_apply_yes": {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      let visite: any = null;
      if (client) {
        const { data } = await supabase
          .from("visites")
          .select("id, offre_id, adresse")
          .eq("client_id", client.id)
          .eq("statut", "effectuee")
          .gte("date_visite", sevenDaysAgo)
          .order("date_visite", { ascending: false })
          .limit(1)
          .maybeSingle();
        visite = data;
      }
      await ack("🚀 Top ! Dossier en préparation, on transmet à la régie sous 24h.");
      await callForward(
        `🎯 ${clientName} veut postuler — ${visite?.adresse || "bien visité"}`,
        "🎯 Demande candidature post-visite",
        "/agent/deposer-candidature",
      );
      return true;
    }

    // ---- T5 post_visit_apply_maybe ----
    case "post_visit_apply_maybe": {
      const followup = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      if (client) {
        await supabase
          .from("clients")
          .update({ note_agent: `[WA J+1 follow-up requested at ${followup}]` })
          .eq("id", client.id);
      }
      await ack("🤔 Pas de souci, on vous relance demain pour votre décision.");
      await callForward(
        `🤔 ${clientName} hésite après visite — relance J+1 demandée`,
        "🤔 Client hésite — relance J+1",
        "/agent/visites",
      );
      return true;
    }

    // ---- T5 post_visit_apply_no ----
    case "post_visit_apply_no": {
      const v = await latestVisite(["effectuee"]);
      if (v) {
        await supabase.from("visites").update({ feedback_agent: "refus_client" }).eq("id", v.id);
      }
      await ack("Bien noté, on continue à chercher pour vous 💪");
      await callForward(
        `❌ ${clientName} ne postule pas — ${v?.adresse || ""}`,
        "❌ Pas de candidature post-visite",
        "/agent/visites",
      );
      return true;
    }

    // ---- T6 candidature_question ----
    case "candidature_question": {
      await ack("📞 Bien sûr ! Posez votre question ici, votre agent vous répondra rapidement.");
      await callForward(
        `❓ ${clientName} a une question sur sa candidature`,
        "❓ Question candidature",
        "/agent/messagerie",
      );
      return true;
    }

    // ---- T8 application_thanks ----
    case "application_thanks": {
      await ack("🙏 Merci pour votre confiance ! On organise la signature et vous envoie la date dès que possible.");
      await callForward(
        `🙏 ${clientName} valide acceptation régie — go signature`,
        "🙏 Client valide signature",
        "/agent/candidatures",
      );
      return true;
    }

    // ---- T10 edl_reschedule ----
    case "edl_reschedule": {
      await ack("🔄 Bien reçu ! Votre agent vous propose de nouveaux créneaux très vite.");
      await callForward(
        `🔄 ${clientName} demande à reprogrammer l'EDL`,
        "🔄 EDL à reprogrammer",
        "/agent/candidatures",
      );
      return true;
    }

    // ---- T11 referral_start ----
    case "referral_start": {
      const link = "https://logisorama.ch/client/parrainage";
      await ack(`🎁 Génial ! Voici votre lien de parrainage personnel : ${link}\n\nChaque ami qui signe = 100 CHF pour vous 💸`);
      return true;
    }

    // ---- T14 agent_message_callback ----
    case "agent_message_callback": {
      await ack("📞 Bien noté, votre agent vous appelle dès que possible !");
      await callForward(
        `📞 ${clientName} demande à être rappelé`,
        "📞 Rappel client demandé",
        "/agent/messagerie",
      );
      return true;
    }

    // ---- T15 agent-side: agent_call_client_now ----
    case "agent_call_client_now": {
      if (agentRow) {
        await notifyAgent(
          agentRow.user_id,
          "📞 Intent appel client logué",
          "Pensez à logger l'appel dans le CRM après contact.",
          "/agent/visites",
        );
      }
      // Pas de réponse au "client" car c'est l'agent qui clique
      return true;
    }

    // ---- T15 agent-side: agent_dispatch_courier ----
    case "agent_dispatch_courier": {
      if (agentRow) {
        await notifyAgent(
          agentRow.user_id,
          "🎥 Ouvrir flow visites déléguées",
          "Assignez un coursier à la visite concernée.",
          "/agent/visites",
        );
      }
      return true;
    }

    // ---- T16 agent-side: agent_candidature_taken ----
    case "agent_candidature_taken": {
      // Mark latest pending candidature as in_preparation by this agent
      if (agentRow) {
        const { data: cand } = await supabase
          .from("candidatures")
          .select("id, client_id")
          .eq("statut", "a_envoyer")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cand) {
          await supabase
            .from("candidatures")
            .update({ statut: "en_preparation" })
            .eq("id", cand.id);
        }
        await notifyAgent(
          agentRow.user_id,
          "✅ Candidature prise en charge",
          "Statut → en_preparation. Préparez & envoyez sous 24h.",
          "/agent/candidatures",
        );
      }
      return true;
    }
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
  if (!appSecret) {
    console.error("whatsapp-webhook: WHATSAPP_APP_SECRET is not configured");
    return new Response(JSON.stringify({ error: "webhook_unavailable" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sigHeader = req.headers.get("x-hub-signature-256");
  const ok = await verifyMetaSignature(rawBody, sigHeader, appSecret);
  if (!ok) {
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
            const handledNew = await handleNewQRButtons(supabase, {
              phoneE164, buttonText: buttonText || "", buttonId: buttonId || "",
            });
            if (handledNew) continue;
          }

          const text = msg.text?.body || buttonText || "[Pièce jointe WhatsApp]";

          // Trouver le profile via téléphone
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .or(`whatsapp_phone.eq.+${fromPhone},telephone.eq.+${fromPhone},whatsapp_phone.eq.${fromPhone},telephone.eq.${fromPhone}`)
            .maybeSingle();

          if (!profile) {
            console.log("Incoming WA from unknown phone", fromPhone, "→ saving to public inbox");
            try {
              const phoneE164Norm = phoneE164 || `+${fromPhone}`;
              const pushName = value?.contacts?.[0]?.profile?.name || null;

              // Upsert conversation
              const { data: existing } = await supabase
                .from("whatsapp_unknown_conversations")
                .select("id, display_name")
                .eq("phone_e164", phoneE164Norm)
                .maybeSingle();

              let unknownConvId = existing?.id as string | undefined;
              if (!unknownConvId) {
                const { data: created } = await supabase
                  .from("whatsapp_unknown_conversations")
                  .insert({
                    phone_e164: phoneE164Norm,
                    display_name: pushName,
                    last_message_at: new Date().toISOString(),
                    status: "nouveau",
                  })
                  .select("id")
                  .single();
                unknownConvId = created?.id;
              } else {
                await supabase
                  .from("whatsapp_unknown_conversations")
                  .update({
                    last_message_at: new Date().toISOString(),
                    status: "nouveau",
                    display_name: existing?.display_name || pushName,
                  })
                  .eq("id", unknownConvId);
              }

              if (unknownConvId) {
                await supabase.from("whatsapp_unknown_messages").insert({
                  conversation_id: unknownConvId,
                  direction: "in",
                  content: text,
                  meta_message_id: msg.id || null,
                  read: false,
                });

                // Push notif aux admins
                try {
                  const { data: admins } = await supabase
                    .from("user_roles").select("user_id").eq("role", "admin");
                  const targetIds = Array.from(new Set((admins || []).map((a: any) => a.user_id).filter(Boolean)));
                  if (targetIds.length) {
                    await supabase.functions.invoke("send-push-notification", {
                      body: {
                        user_ids: targetIds,
                        title: `💬 WhatsApp — ${pushName || phoneE164Norm}`,
                        body: text.slice(0, 120),
                        link: "/admin/whatsapp",
                        data: { unknown_conversation_id: String(unknownConvId), type: "whatsapp_inbound_unknown" },
                      },
                    });
                  }
                } catch (e) { console.warn("push unknown failed", e); }
              }
            } catch (e) {
              console.error("unknown WA save failed", e);
            }
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
              p_link: "/agent/whatsapp",
              p_metadata: { conversation_id: conversationId },
            }).then(() => {}).catch(() => {});

            // Push notification mobile (PWA) — best-effort
            try {
              const { data: clientProfile } = await supabase
                .from("profiles").select("prenom, nom").eq("id", profile.id).maybeSingle();
              const senderName = `${clientProfile?.prenom || ""} ${clientProfile?.nom || ""}`.trim() || "Client";
              const { data: admins } = await supabase
                .from("user_roles").select("user_id").eq("role", "admin");
              const targetIds = Array.from(new Set([
                agent.user_id,
                ...(admins || []).map((a: any) => a.user_id),
              ].filter(Boolean)));
              await supabase.functions.invoke("send-push-notification", {
                body: {
                  user_ids: targetIds,
                  title: `💬 WhatsApp — ${senderName}`,
                  body: text.slice(0, 120),
                  link: "/admin/whatsapp",
                  data: { conversation_id: String(conversationId), type: "whatsapp_inbound" },
                },
              });
            } catch (e) { console.warn("push notif failed", e); }


            // Forward WhatsApp à l'agent + admin via template HSM
            // (le free text ne marche que si fenêtre 24h ouverte côté agent — rare)
            const { data: clientProfile } = await supabase
              .from("profiles").select("prenom, nom").eq("id", profile.id).maybeSingle();
            const clientName = `${clientProfile?.prenom || ""} ${clientProfile?.nom || ""}`.trim() || "Client";
            const extract = text.replace(/[\u202F\u00A0]/g, ' ').slice(0, 200);
            await forwardClientReplyToStaff({
              supabase,
              clientId: client.id,
              agentId: client.agent_id,
              templateKey: "staff_client_inbound",
              variables: [clientName, extract, "logisorama.ch/agent/whatsapp"],
              summary: `📱 [WA] ${clientName} : ${extract}\n→ logisorama.ch/agent/whatsapp`,
              notifTitle: "📱 Message WhatsApp client",
              notifLink: "/agent/whatsapp",
              excludePhone: phoneE164,
            }).catch((e) => console.error("forward failed", e));
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
