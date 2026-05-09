// Send-followup WhatsApp campaign (Location)
// Manual orchestration function. Calls send-whatsapp-notification for each lead.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE_KEY = "location_rdv_activation_v2";
const EVENT_TYPE = "campaign_location";
const RDV_BUTTON_URL =
  "https://logisorama.ch/rendez-vous?utm_source=whatsapp&utm_medium=business_message&utm_campaign=location_v2";
const ACTIVATION_LINK = "https://logisorama.ch/rendez-vous";
const MAX_BATCH = 3;

function sanitizeWhatsappText(s: string): string {
  return (s || "")
    .replace(/[\r\n\t\v\f]+/g, " ")
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B]/g, " ")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, 60);
}

function buildWhatsappFirstNameParam(firstName: string | null | undefined): string {
  return sanitizeWhatsappText(firstName || "") || "à toi";
}

function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = String(raw).replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) {
    if (p.startsWith("0")) p = "+41" + p.slice(1);
    else p = "+" + p;
  }
  // Fix common Swiss formatting error: "+410xxxxxxxxx" → "+41xxxxxxxxx"
  if (/^\+410\d{9,10}$/.test(p)) p = "+41" + p.slice(4);
  if (!/^\+\d{8,15}$/.test(p)) return null;
  return p;
}

function bodyPreviewText(firstNameParam: string): string {
  return [
    `Bonjour ${firstNameParam},`,
    "",
    "🏠 Tu cherches un appartement en Suisse romande ?",
    "",
    "On peut analyser gratuitement ta recherche et t'aider à trouver un logement off-market à Crissier ou en Suisse romande.",
    "",
    `🎯 Activation immédiate en ligne : ${ACTIVATION_LINK}`,
    "",
    "Ou réserve un RDV gratuit à notre bureau de Crissier en cliquant sur le bouton ci-dessous 👇",
    "",
    "Logisorama.ch by Immo-Rama.ch · Réponds STOP pour te désinscrire.",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mode: "preview" | "test" | "send" = body?.mode;
  const allowResend: boolean = body?.allowResend === true;
  const leadIds: string[] = Array.isArray(body?.lead_ids) ? body.lead_ids : [];

  if (!["preview", "test", "send"].includes(mode)) {
    return new Response(JSON.stringify({ error: "mode must be preview|test|send" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ────── PREVIEW
  if (mode === "preview") {
    const firstName = typeof body?.first_name === "string" ? body.first_name : "V-Yael";
    const param = buildWhatsappFirstNameParam(firstName);
    console.log("[send-followup-whatsapp]", { mode, template_key: TEMPLATE_KEY, param });
    return new Response(JSON.stringify({
      template_key: TEMPLATE_KEY,
      first_name_param: param,
      body_rendered: bodyPreviewText(param),
      button_url: RDV_BUTTON_URL,
      activation_link: ACTIVATION_LINK,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ────── TEST
  if (mode === "test") {
    const testTo = Deno.env.get("WHATSAPP_TEST_RECIPIENT_E164");
    if (!testTo) {
      return new Response(JSON.stringify({ error: "WHATSAPP_TEST_RECIPIENT_E164 not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const phone = normalizePhoneE164(testTo);
    if (!phone) {
      return new Response(JSON.stringify({ error: "WHATSAPP_TEST_RECIPIENT_E164 invalid" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const param = buildWhatsappFirstNameParam(body?.first_name || "à toi");
    console.log("[send-followup-whatsapp]", { mode, template_key: TEMPLATE_KEY, phone, param });

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
      },
      body: JSON.stringify({
        event_type: EVENT_TYPE,
        template_key: TEMPLATE_KEY,
        recipient_phone_override: phone,
        variables: [param],
        context_type: "test",
        context_ref: null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: res.ok, result: json }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ────── SEND
  if (!leadIds.length) {
    return new Response(JSON.stringify({ error: "lead_ids required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const batch = leadIds.slice(0, MAX_BATCH);

  // Fetch leads
  const { data: leads, error: leadsErr } = await supabase
    .from("meta_leads")
    .select("id, first_name, last_name, email, phone, phone_e164, whatsapp_opt_in, whatsapp_opt_out, campaign_key")
    .in("id", batch);

  if (leadsErr) {
    return new Response(JSON.stringify({ error: leadsErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pre-load already-sent set for dedup
  let alreadySent = new Set<string>();
  if (!allowResend) {
    const { data: sent } = await supabase
      .from("whatsapp_notification_logs")
      .select("context_ref")
      .eq("template_key", TEMPLATE_KEY)
      .eq("status", "sent")
      .in("context_ref", batch);
    alreadySent = new Set((sent || []).map((r: any) => r.context_ref));
  }

  const results: Array<{ lead_id: string; status: "sent" | "skipped" | "failed"; reason?: string }> = [];

  for (const lead of leads || []) {
    try {
      if (!lead.whatsapp_opt_in || lead.whatsapp_opt_out) {
        results.push({ lead_id: lead.id, status: "skipped", reason: "opt-in manquant ou opt-out" });
        continue;
      }
      if (!allowResend && alreadySent.has(lead.id)) {
        results.push({ lead_id: lead.id, status: "skipped", reason: "déjà envoyé" });
        continue;
      }
      const phone = normalizePhoneE164(lead.phone_e164 || lead.phone);
      if (!phone) {
        results.push({ lead_id: lead.id, status: "skipped", reason: "téléphone invalide" });
        continue;
      }
      // Persist normalized phone for future runs
      if (phone !== lead.phone_e164) {
        await supabase.from("meta_leads").update({ phone_e164: phone }).eq("id", lead.id);
      }

      const param = buildWhatsappFirstNameParam(lead.first_name);
      console.log("[send-followup-whatsapp]", { mode, lead_id: lead.id, phone, param });

      const inboxBody = bodyPreviewText(param);
      const displayName = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() || null;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "apikey": SERVICE_KEY,
        },
        body: JSON.stringify({
          event_type: EVENT_TYPE,
          template_key: TEMPLATE_KEY,
          recipient_phone_override: phone,
          variables: [param],
          context_type: "lead",
          context_ref: lead.id,
          inbox_body_text: inboxBody,
          inbox_display_name: displayName,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok !== false) {
        results.push({ lead_id: lead.id, status: "sent" });
      } else {
        results.push({ lead_id: lead.id, status: "failed", reason: json?.error || `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ lead_id: lead.id, status: "failed", reason: e?.message || String(e) });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return new Response(JSON.stringify({
    ok: true,
    summary: { processed: results.length, sent, skipped, failed, batch_max: MAX_BATCH, total_requested: leadIds.length },
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
