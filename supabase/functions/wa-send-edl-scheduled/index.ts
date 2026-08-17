// T10 — Send etat_des_lieux_scheduled (9 vars)
import { createClient } from "npm:@supabase/supabase-js@2";
import {
import { denyIfNotInternal } from "../_shared/internal-auth.ts";
  fmtPieces, fmtPrixCHF, fmtDateCourtFR, lienAnnonceOuFallback,
  loadOffreDetails, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-edl-scheduled');
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
    .from("candidatures")
    .select("client_id, offre_id, date_etat_lieux, heure_etat_lieux")
    .eq("id", candidature_id).maybeSingle();
  if (!c?.client_id || !c.date_etat_lieux) {
    return new Response(JSON.stringify({ skipped: "missing_data" }), { status: 200, headers: corsHeaders });
  }

  const offre = await loadOffreDetails(supabase, c.offre_id);
  const { data: client } = await supabase.from("clients").select("user_id").eq("id", c.client_id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();

  const result = await callSendWhatsApp({
    event_type: "etat_des_lieux_scheduled",
    template_key: "etat_des_lieux_scheduled",
    client_id: c.client_id,
    preference_key: "candidature_updates_enabled",
    variables: [
      profile?.prenom || "Client",
      fmtDateCourtFR(c.date_etat_lieux),
      c.heure_etat_lieux || "—",
      offre?.adresse || "—",
      fmtPieces(offre?.pieces),
      String(offre?.surface ?? "—"),
      fmtPrixCHF(offre?.prix),
      (offre as any)?.concierge_nom || "Sur place",
      lienAnnonceOuFallback(offre?.lien_annonce),
    ],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
