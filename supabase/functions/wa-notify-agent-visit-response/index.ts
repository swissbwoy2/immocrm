import { denyIfNotInternal } from "../_shared/internal-auth.ts";
// T15 — wa-notify-agent-visit-response (8 vars) — interne agent
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fmtPieces, fmtPrixCHF, fmtDateFR, lienAnnonceOuFallback,
  loadOffreDetails, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-notify-agent-visit-response');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { visite_id, reponse } = await req.json().catch(() => ({}));
  if (!visite_id) {
    return new Response(JSON.stringify({ error: "visite_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: v } = await supabase
    .from("visites")
    .select("id, client_id, agent_id, offre_id, date_visite, adresse, statut")
    .eq("id", visite_id).maybeSingle();
  if (!v?.agent_id) return new Response(JSON.stringify({ skipped: "no_agent" }), { status: 200, headers: corsHeaders });

  const { data: agent } = await supabase.from("agents").select("user_id").eq("id", v.agent_id).maybeSingle();
  const { data: agentProfile } = await supabase
    .from("profiles").select("whatsapp_phone, telephone, prenom, nom").eq("id", agent?.user_id).maybeSingle();
  const agentPhone = agentProfile?.whatsapp_phone || agentProfile?.telephone;
  if (!agentPhone) return new Response(JSON.stringify({ skipped: "no_agent_phone" }), { status: 200, headers: corsHeaders });

  const offre = await loadOffreDetails(supabase, v.offre_id);
  let clientFull = "Client";
  if (v.client_id) {
    const { data: cl } = await supabase.from("clients").select("user_id").eq("id", v.client_id).maybeSingle();
    const { data: cp } = await supabase.from("profiles").select("prenom, nom").eq("id", cl?.user_id).maybeSingle();
    const fn = `${cp?.prenom || ""} ${cp?.nom || ""}`.trim();
    if (fn) clientFull = fn;
  }

  const reponseFmt = reponse || (v.statut === "deleguee" ? "déléguée" : v.statut === "annulee" ? "refusée" : "confirmée");

  const result = await callSendWhatsApp({
    event_type: "alerte_agent_reponse_visite",
    template_key: "alerte_agent_reponse_visite",
    recipient_phone_override: agentPhone,
    agent_id: v.agent_id,
    variables: [
      clientFull,
      fmtPieces(offre?.pieces),
      String(offre?.surface ?? "—"),
      offre?.adresse || v.adresse || "—",
      fmtPrixCHF(offre?.prix),
      fmtDateFR(v.date_visite),
      reponseFmt,
      lienAnnonceOuFallback(offre?.lien_annonce),
    ],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
