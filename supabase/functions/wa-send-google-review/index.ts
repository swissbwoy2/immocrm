// T12 — Cron J+7 after cles_remises: google_review_request (6 vars)
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadOffreDetails, callSendWhatsApp, loadAgentName } from "../_shared/wa-helpers.ts";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-google-review');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // J+7 window
  const target = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { data: candidatures } = await supabase
    .from("candidatures")
    .select("id, client_id, offre_id, cles_remises_at")
    .eq("cles_remises", true)
    .eq("avis_google_envoye", false)
    .gte("cles_remises_at", `${target}T00:00:00Z`)
    .lte("cles_remises_at", `${target}T23:59:59Z`)
    .limit(50);

  let sent = 0;
  for (const c of candidatures || []) {
    if (!c.client_id) continue;
    const offre = await loadOffreDetails(supabase, c.offre_id);
    const { data: client } = await supabase.from("clients").select("user_id, agent_id").eq("id", c.client_id).maybeSingle();
    const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();
    const agentName = await loadAgentName(supabase, client?.agent_id);

    await callSendWhatsApp({
      event_type: "google_review_request",
      template_key: "google_review_request",
      client_id: c.client_id,
      preference_key: "agent_messages_enabled",
      variables: [
        profile?.prenom || "Client",
        offre?.adresse || "votre nouveau logement",
        agentName,
        "5/5 ⭐",
        "120",
        agentName,
      ],
    });

    await supabase.from("candidatures").update({ avis_google_envoye: true }).eq("id", c.id);
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
