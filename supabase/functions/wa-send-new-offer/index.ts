import { denyIfNotInternal } from "../_shared/internal-auth.ts";
// T2 — Send new_offer template (9 vars) on INSERT offres
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fmtPieces, fmtPrixCHF, fmtDispo, lienAnnonceOuFallback,
  loadOffreDetails, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-new-offer');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { offre_id } = await req.json().catch(() => ({}));
  if (!offre_id) {
    return new Response(JSON.stringify({ error: "offre_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const offre = await loadOffreDetails(supabase, offre_id);
  if (!offre) {
    return new Response(JSON.stringify({ skipped: "offre_not_found" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: offreFull } = await supabase
    .from("offres").select("client_id").eq("id", offre_id).maybeSingle();
  if (!offreFull?.client_id) {
    return new Response(JSON.stringify({ skipped: "no_client" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: client } = await supabase
    .from("clients").select("user_id").eq("id", offreFull.client_id).maybeSingle();
  const { data: profile } = await supabase
    .from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();

  const description = (offre.description || "Bien sélectionné par votre agent").slice(0, 200);

  const result = await callSendWhatsApp({
    event_type: "new_offer",
    template_key: "new_offer_available",
    client_id: offreFull.client_id,
    preference_key: "offer_alerts_enabled",
    variables: [
      profile?.prenom || "Client",
      fmtPieces(offre.pieces),
      String(offre.surface ?? "—"),
      offre.adresse || "—",
      offre.etage || "—",
      fmtPrixCHF(offre.prix),
      fmtDispo(offre.disponibilite),
      description,
      lienAnnonceOuFallback(offre.lien_annonce),
    ],
    // Dynamic suffix for the "Voir l'offre" URL button: full app link to the offer
    url_button_params: [`client/offres-recues?offreId=${offre_id}`],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
