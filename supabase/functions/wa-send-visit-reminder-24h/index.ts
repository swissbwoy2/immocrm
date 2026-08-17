// T4 — Cron visit_reminder_24h (9 vars) — daily 09:00 Europe/Zurich
import { createClient } from "npm:@supabase/supabase-js@2";
import {
import { denyIfNotInternal } from "../_shared/internal-auth.ts";
  fmtPieces, fmtPrixCHF, fmtHeureFR, lienAnnonceOuFallback,
  loadOffreDetails, loadAgentName, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-visit-reminder-24h');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Visites planifiées entre now+23h et now+25h, pas encore rappelées
  const start = new Date(Date.now() + 23 * 3600 * 1000).toISOString();
  const end = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
  const { data: visites } = await supabase
    .from("visites")
    .select("id, client_id, agent_id, offre_id, adresse, date_visite, reminder_24h_sent")
    .in("statut", ["planifiee", "confirmee", "proposee"])
    .gte("date_visite", start)
    .lte("date_visite", end)
    .or("reminder_24h_sent.is.null,reminder_24h_sent.eq.false")
    .limit(100);

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
      event_type: "visit_reminder_24h",
      template_key: "visit_reminder_24h",
      client_id: v.client_id,
      preference_key: "visit_reminders_enabled",
      variables: [
        profile?.prenom || "Client",
        fmtHeureFR(v.date_visite),
        fmtPieces(offre?.pieces),
        String(offre?.surface ?? "—"),
        offre?.adresse || v.adresse || "—",
        fmtPrixCHF(offre?.prix),
        offre?.etage || "—",
        lienAnnonceOuFallback(offre?.lien_annonce),
        agentName,
      ],
    });

    await supabase.from("visites")
      .update({ reminder_24h_sent: true, reminder_24h_sent_at: new Date().toISOString() })
      .eq("id", v.id);
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
