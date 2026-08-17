// Admin diagnostic: test send every active WhatsApp template to a chosen phone.
// Returns a per-template report. Logs land in whatsapp_notification_logs as usual,
// and the admin failure-trigger fires automatically on any failure.
import { createClient } from "npm:@supabase/supabase-js@2";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static fixtures matching every template's variables_schema (ordered).
// Header / URL button params handled where templates require them.
const FIXTURES: Record<string, { variables: string[]; header_params?: string[]; url_button_params?: string[] }> = {
  agent_message_alert:        { variables: ["Test", "Christ", "Message de test diagnostic"] },
  alerte_agent_candidature:   { variables: ["Test Client", "Appartement test - Lausanne", "https://logisorama.ch"] },
  alerte_agent_reponse_visite:{ variables: ["Test Client", "Appartement test", "Mer 8 mai 14h", "Acceptée", "+41795912937"] },
  application_accepted:       { variables: ["Test", "Av. de la Test 1, 1000 Lausanne", "1500"] },
  candidature_demandee_client:{ variables: ["Test", "Av. de la Test 1, 1000 Lausanne", "Christ"] },
  candidature_refus_client:   { variables: ["Test", "Av. de la Test 1, 1000 Lausanne"] },
  etat_des_lieux_scheduled:   { variables: ["Test", "vendredi 9 mai 2026 à 14:00", "Av. de la Test 1, Lausanne"] },
  google_review_request:      { variables: ["Test", "Christ"] },
  keys_handover:              { variables: ["Test", "Av. de la Test 1, 1000 Lausanne"] },
  mandate_expiring_30d:       { variables: ["Test", "5 juin 2026"] },
  new_offer_available:        { variables: ["Test", "https://logisorama.ch"], url_button_params: ["client/offres-recues?offreId=test"] },
  post_visite_question:       { variables: ["Test", "Appartement test - Lausanne"] },
  proposition_visite_client:  { variables: ["Test", "Appartement test - Lausanne", "vendredi 9 mai à 14:00", "Christ"] },
  signature_scheduled:        { variables: ["Test", "vendredi 9 mai 2026 à 14:00", "Régie Test SA, Lausanne"] },
  visit_reminder_24h:         { variables: ["Test", "14:00", "Av. de la Test 1, Lausanne"] },
  welcome_activation:         { variables: ["Test"], header_params: ["Test"] },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-test-all-templates');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth: caller must be admin
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token);
  const userId = userData?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles || []).some((r: any) => r.role === "admin")) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { recipient_phone } = await req.json().catch(() => ({}));
  if (!recipient_phone) {
    return new Response(JSON.stringify({ error: "recipient_phone required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: templates } = await supabase
    .from("whatsapp_message_templates")
    .select("template_key, template_name_meta")
    .eq("is_active", true)
    .order("template_key");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const report: any[] = [];

  for (const t of (templates || [])) {
    const key = t.template_key as string;
    const fixture = FIXTURES[key];
    if (!fixture) {
      report.push({ template_key: key, ok: false, error: "no_fixture" });
      continue;
    }
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          event_type: `diag_${key}`,
          template_key: key,
          recipient_phone_override: recipient_phone,
          variables: fixture.variables,
          header_params: fixture.header_params,
          url_button_params: fixture.url_button_params,
          context_type: "diagnostic",
          context_ref: `test-${Date.now()}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      report.push({
        template_key: key,
        template_name_meta: t.template_name_meta,
        ok: !!json?.ok,
        meta_message_id: json?.meta_message_id ?? null,
        error: json?.ok ? null : (json?.error ?? "unknown"),
      });
    } catch (e: any) {
      report.push({ template_key: key, ok: false, error: String(e?.message || e) });
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const summary = {
    total: report.length,
    ok: report.filter((r) => r.ok).length,
    failed: report.filter((r) => !r.ok).length,
  };

  return new Response(JSON.stringify({ summary, report }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
