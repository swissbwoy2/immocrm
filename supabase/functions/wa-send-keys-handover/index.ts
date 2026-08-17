import { denyIfNotInternal } from "../_shared/internal-auth.ts";
// T11 — Send keys_handover (7 vars)
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fmtPieces, fmtPrixCHF, fmtDateCourtFR,
  loadOffreDetails, callSendWhatsApp,
} from "../_shared/wa-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-keys-handover');
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
    .select("client_id, offre_id, cles_remises_at")
    .eq("id", candidature_id).maybeSingle();
  if (!c?.client_id) return new Response(JSON.stringify({ skipped: "no_client" }), { status: 200, headers: corsHeaders });

  const offre = await loadOffreDetails(supabase, c.offre_id);
  const { data: client } = await supabase.from("clients").select("user_id").eq("id", c.client_id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();
  const dateClés = c.cles_remises_at ? fmtDateCourtFR(c.cles_remises_at) : fmtDateCourtFR(new Date().toISOString());

  const result = await callSendWhatsApp({
    event_type: "keys_handover",
    template_key: "keys_handover",
    client_id: c.client_id,
    preference_key: "candidature_updates_enabled",
    variables: [
      profile?.prenom || "Client",
      fmtPieces(offre?.pieces),
      String(offre?.surface ?? "—"),
      offre?.adresse || "—",
      fmtPrixCHF(offre?.prix),
      dateClés,
      "démarrer",
    ],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
