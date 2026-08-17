import { denyIfNotInternal } from "../_shared/internal-auth.ts";
// T5 — Cron post_visite_question (7 vars) H+3 after visite effectuee
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fmtPieces, fmtPrixCHF, lienAnnonceOuFallback,
  loadOffreDetails, loadAgentName, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-post-visite');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data: visites } = await supabase
    .from("visites")
    .select("id, client_id, agent_id, offre_id, adresse, date_visite")
    .eq("statut", "effectuee")
    .eq("post_visit_question_sent", false)
    .lte("date_visite", threeHoursAgo)
    .limit(50);

  let sent = 0;
  for (const v of visites || []) {
    if (!v.client_id) continue;
    const { data: client } = await supabase
      .from("clients").select("user_id").eq("id", v.client_id).maybeSingle();
    const { data: profile } = await supabase
      .from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();
    const offre = await loadOffreDetails(supabase, v.offre_id);
    const agentName = await loadAgentName(supabase, v.agent_id);

    await callSendWhatsApp({
      event_type: "post_visite_question",
      template_key: "post_visite_question",
      client_id: v.client_id,
      preference_key: "visit_reminders_enabled",
      variables: [
        profile?.prenom || "Client",
        fmtPieces(offre?.pieces),
        String(offre?.surface ?? "—"),
        offre?.adresse || v.adresse || "—",
        fmtPrixCHF(offre?.prix),
        lienAnnonceOuFallback(offre?.lien_annonce),
        agentName,
      ],
    });

    await supabase.from("visites")
      .update({ post_visit_question_sent: true, post_visit_question_sent_at: new Date().toISOString() })
      .eq("id", v.id);
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
