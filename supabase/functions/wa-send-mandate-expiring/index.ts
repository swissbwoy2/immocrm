// Edge Function: wa-send-mandate-expiring
// Cron J-30: send WhatsApp template "logisorama_mandate_expiring_30d" to clients
// whose mandate ends in 30 days.

import { createClient } from "npm:@supabase/supabase-js@2";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDateFR(isoDate: string): string {
  // isoDate: YYYY-MM-DD
  const [y, m, d] = isoDate.split("-").map((n) => parseInt(n, 10));
  return `${d} ${FR_MONTHS[m - 1]} ${y}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-mandate-expiring');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Compute target date in Europe/Zurich. We want clients whose
    // mandate_official_end_date is exactly today + 30 days (in CH timezone).
    const nowCH = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
    const targetDate = new Date(nowCH);
    targetDate.setDate(targetDate.getDate() + 30);
    const targetIso = targetDate.toISOString().split("T")[0];

    // Fetch all candidate clients
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, user_id, mandat_date_signature, mandate_pause_days, mandate_official_end_date, statut, mandate_paused_at")
      .eq("statut", "actif")
      .eq("mandate_official_end_date", targetIso)
      .is("mandate_paused_at", null)
      .limit(15000);

    if (error) throw error;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ ok: true, target_date: targetIso, sent: 0, skipped: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;
    const results: Array<{ client_id: string; ok: boolean; reason?: string }> = [];

    for (const client of clients) {
      // Idempotency: skip if already sent today
      const todayCH = nowCH.toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("whatsapp_notification_logs")
        .select("id")
        .eq("client_id", client.id)
        .eq("template_key", "mandate_expiring_30d")
        .eq("status", "sent")
        .gte("sent_at", `${todayCH}T00:00:00.000Z`)
        .lte("sent_at", `${todayCH}T23:59:59.999Z`)
        .maybeSingle();

      if (existing) {
        skipped++;
        results.push({ client_id: client.id, ok: false, reason: "already_sent_today" });
        continue;
      }

      // Resolve profile (prenom)
      const { data: profile } = await supabase
        .from("profiles")
        .select("prenom, nom")
        .eq("id", client.user_id)
        .maybeSingle();

      const prenom = profile?.prenom || profile?.nom || "Cher client";

      // Compute daysSinceSignature for downstream button logic
      let daysSinceSignature = 0;
      if (client.mandat_date_signature) {
        const sigDate = new Date(client.mandat_date_signature);
        daysSinceSignature = Math.max(0, daysBetween(sigDate, nowCH) - (client.mandate_pause_days ?? 0));
      }
      const refundEligibleAtSend = daysSinceSignature >= 82;

      // Counts: offres + visites effectuees
      const { count: nbOffres } = await supabase
        .from("offres").select("id", { count: "exact", head: true }).eq("client_id", client.id);
      const { count: nbVisites } = await supabase
        .from("visites").select("id", { count: "exact", head: true }).eq("client_id", client.id).eq("statut", "effectuee");

      // Invoke the generic sender
      const { data: invoke, error: invokeErr } = await supabase.functions.invoke(
        "send-whatsapp-notification",
        {
          body: {
            event_type: "mandate_expiring_30d",
            template_key: "mandate_expiring_30d",
            client_id: client.id,
            variables: [
              prenom,
              formatDateFR(client.mandate_official_end_date),
              String(nbOffres ?? 0),
              String(nbVisites ?? 0),
            ],
            preference_key: null,
          },
        },
      );

      if (invokeErr || invoke?.ok === false || invoke?.skipped) {
        skipped++;
        results.push({ client_id: client.id, ok: false, reason: invoke?.reason || invoke?.error || invokeErr?.message || "unknown" });
        continue;
      }

      sent++;
      results.push({ client_id: client.id, ok: true });

      // Stash context for the eventual button click (refund eligibility lookup)
      // Note: we already store this via send-whatsapp-notification's payload_json,
      // but we also write it explicitly to whatsapp_pending_actions so the webhook
      // can resolve it without joining logs.
      const { data: profileForPhone } = await supabase
        .from("profiles")
        .select("whatsapp_phone, telephone")
        .eq("id", client.user_id)
        .maybeSingle();
      const phone = profileForPhone?.whatsapp_phone || profileForPhone?.telephone;
      if (phone) {
        await supabase.from("whatsapp_pending_actions").insert({
          recipient_phone: phone.startsWith("+") ? phone : `+${phone}`,
          client_id: client.id,
          action_type: "mandate_expiring_30d_context",
          context_json: {
            days_since_signature: daysSinceSignature,
            refund_eligible_at_send: refundEligibleAtSend,
            mandate_official_end_date: client.mandate_official_end_date,
          },
          // Keep this context for 24h so user has time to click
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, target_date: targetIso, sent, skipped, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("wa-send-mandate-expiring error", err);
    return new Response(JSON.stringify({ ok: false, error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
