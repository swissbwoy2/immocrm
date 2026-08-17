// T8 — wa-send-application-accepted (8 vars) — fr enrichi
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

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-application-accepted');
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
    .select("id, client_id, offre_id, date_signature_choisie")
    .eq("id", candidature_id)
    .maybeSingle();
  if (!c?.client_id) return new Response(JSON.stringify({ skipped: "no_client" }), { status: 200, headers: corsHeaders });

  const offre = await loadOffreDetails(supabase, c.offre_id);
  const { data: client } = await supabase.from("clients").select("user_id, gerance_actuelle").eq("id", c.client_id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();
  const regieNom = (offre as any)?.regie_nom || client?.gerance_actuelle || "Régie";

  const result = await callSendWhatsApp({
    event_type: "application_accepted",
    template_key: "application_accepted",
    client_id: c.client_id,
    context_type: "candidature",
    context_ref: candidature_id,
    preference_key: "candidature_updates_enabled",
    variables: [
      profile?.prenom || "Client",
      regieNom,
      fmtPieces(offre?.pieces),
      String(offre?.surface ?? "—"),
      offre?.adresse || "—",
      fmtPrixCHF(offre?.prix),
      c.date_signature_choisie ? fmtDateCourtFR(c.date_signature_choisie) : "À confirmer",
      lienAnnonceOuFallback(offre?.lien_annonce),
    ],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
