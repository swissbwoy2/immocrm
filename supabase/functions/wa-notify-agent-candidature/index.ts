import { denyIfNotInternal } from "../_shared/internal-auth.ts";
// T16 — wa-notify-agent-candidature (8 vars) — interne agent
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fmtPieces, fmtPrixCHF, fmtDateCourtFR, lienAnnonceOuFallback,
  loadOffreDetails, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-notify-agent-candidature');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { candidature_id } = await req.json().catch(() => ({}));
  if (!candidature_id) {
    return new Response(JSON.stringify({ error: "candidature_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: c } = await supabase
    .from("candidatures").select("id, client_id, offre_id").eq("id", candidature_id).maybeSingle();
  if (!c?.client_id) return new Response(JSON.stringify({ skipped: "no_client" }), { status: 200, headers: corsHeaders });

  const { data: client } = await supabase.from("clients").select("user_id, agent_id, gerance_actuelle").eq("id", c.client_id).maybeSingle();
  if (!client?.agent_id) return new Response(JSON.stringify({ skipped: "no_agent" }), { status: 200, headers: corsHeaders });

  const { data: agent } = await supabase.from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
  const { data: agentProfile } = await supabase
    .from("profiles").select("whatsapp_phone, telephone").eq("id", agent?.user_id).maybeSingle();
  const agentPhone = agentProfile?.whatsapp_phone || agentProfile?.telephone;
  if (!agentPhone) return new Response(JSON.stringify({ skipped: "no_agent_phone" }), { status: 200, headers: corsHeaders });

  const offre = await loadOffreDetails(supabase, c.offre_id);
  const { data: clientProfile } = await supabase.from("profiles").select("prenom, nom").eq("id", client.user_id).maybeSingle();
  const clientFull = `${clientProfile?.prenom || ""} ${clientProfile?.nom || ""}`.trim() || "Client";

  // Date dernière visite
  let dateVisite = "—";
  if (c.client_id && c.offre_id) {
    const { data: vlast } = await supabase
      .from("visites").select("date_visite").eq("client_id", c.client_id).eq("offre_id", c.offre_id)
      .eq("statut", "effectuee").order("date_visite", { ascending: false }).limit(1).maybeSingle();
    if (vlast?.date_visite) dateVisite = fmtDateCourtFR(vlast.date_visite);
  }

  const regieNom = (offre as any)?.regie_nom || client.gerance_actuelle || "Régie inconnue";

  const result = await callSendWhatsApp({
    event_type: "alerte_agent_candidature",
    template_key: "alerte_agent_candidature",
    recipient_phone_override: agentPhone,
    agent_id: client.agent_id,
    context_type: "candidature",
    context_ref: candidature_id,
    variables: [
      clientFull,
      fmtPieces(offre?.pieces),
      String(offre?.surface ?? "—"),
      offre?.adresse || "—",
      fmtPrixCHF(offre?.prix),
      dateVisite,
      regieNom,
      lienAnnonceOuFallback(offre?.lien_annonce),
    ],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
