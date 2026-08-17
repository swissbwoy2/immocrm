// T7 — wa-send-candidature-refus (7 vars) on UPDATE candidatures.statut=refusee
import { createClient } from "npm:@supabase/supabase-js@2";
import {
import { denyIfNotInternal } from "../_shared/internal-auth.ts";
  fmtPieces, fmtPrixCHF, loadOffreDetails, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-candidature-refus');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { candidature_id, motif } = await req.json().catch(() => ({}));
  if (!candidature_id) {
    return new Response(JSON.stringify({ error: "candidature_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: c } = await supabase
    .from("candidatures").select("id, client_id, offre_id").eq("id", candidature_id).maybeSingle();
  if (!c?.client_id) return new Response(JSON.stringify({ skipped: "no_client" }), { status: 200, headers: corsHeaders });

  const offre = await loadOffreDetails(supabase, c.offre_id);
  const { data: client } = await supabase.from("clients").select("user_id, gerance_actuelle").eq("id", c.client_id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();
  const regieNom = (offre as any)?.regie_nom || client?.gerance_actuelle || "Régie";

  const result = await callSendWhatsApp({
    event_type: "candidature_refus_client",
    template_key: "candidature_refus_client",
    client_id: c.client_id,
    context_type: "candidature",
    context_ref: candidature_id,
    preference_key: "candidature_updates_enabled",
    variables: [
      profile?.prenom || "Client",
      fmtPieces(offre?.pieces),
      String(offre?.surface ?? "—"),
      offre?.adresse || "—",
      fmtPrixCHF(offre?.prix),
      regieNom,
      motif || "Non précisé",
    ],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
