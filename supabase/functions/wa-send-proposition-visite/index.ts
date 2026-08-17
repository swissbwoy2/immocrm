import { denyIfNotInternal } from "../_shared/internal-auth.ts";
// T3 — Send proposition_visite_client (8 vars)
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fmtPieces, fmtPrixCHF, fmtDateFR, lienAnnonceOuFallback,
  loadOffreDetails, loadAgentName, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-proposition-visite');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { visite_id } = await req.json().catch(() => ({}));
  if (!visite_id) {
    return new Response(JSON.stringify({ error: "visite_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: v } = await supabase
    .from("visites")
    .select("id, client_id, agent_id, offre_id, date_visite, adresse")
    .eq("id", visite_id)
    .maybeSingle();
  if (!v?.client_id) {
    return new Response(JSON.stringify({ skipped: "no_client" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const offre = await loadOffreDetails(supabase, v.offre_id);
  const agentName = await loadAgentName(supabase, v.agent_id);

  const { data: client } = await supabase
    .from("clients").select("user_id").eq("id", v.client_id).maybeSingle();
  const { data: profile } = await supabase
    .from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();

  const result = await callSendWhatsApp({
    event_type: "proposition_visite_client",
    template_key: "proposition_visite_client",
    client_id: v.client_id,
    preference_key: "visit_reminders_enabled",
    variables: [
      profile?.prenom || "Client",
      agentName,
      fmtPieces(offre?.pieces),
      String(offre?.surface ?? "—"),
      offre?.adresse || v.adresse || "—",
      fmtPrixCHF(offre?.prix),
      fmtDateFR(v.date_visite),
      lienAnnonceOuFallback(offre?.lien_annonce),
    ],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
