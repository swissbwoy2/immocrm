import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scanClientExtracts } from "../_shared/extract-poursuites.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return jsonResponse({ ok: false, error: "LOVABLE_API_KEY non configurée" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ ok: false, error: "Authentification requise" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ ok: false, error: "Session invalide" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { client_id } = body;
    if (!client_id) return jsonResponse({ ok: false, error: "client_id requis" }, 400);

    const { data: client } = await supabase
      .from("clients")
      .select("id, user_id, agent_id")
      .eq("id", client_id)
      .maybeSingle();
    if (!client) return jsonResponse({ ok: false, error: "Client introuvable" }, 404);

    const isOwner = client.user_id === userData.user.id;
    let isStaff = false;
    if (!isOwner) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      isStaff = (roles ?? []).some((r: any) => ["admin", "agent"].includes(r.role));
    }
    if (!isOwner && !isStaff) return jsonResponse({ ok: false, error: "Accès refusé" }, 403);

    const { best, scanned, total } = await scanClientExtracts(supabase, client_id, lovableKey);

    if (!best) {
      return jsonResponse({
        ok: false,
        error: total === 0
          ? "Aucun extrait de poursuites trouvé pour ce client. Uploadez d'abord un extrait."
          : "Aucune date détectable dans les extraits. Saisissez-la manuellement.",
        total_scanned: scanned,
        total_extracts: total,
      }, total === 0 ? 404 : 422);
    }

    const { error: updateErr } = await supabase
      .from("clients")
      .update({
        extrait_poursuites_date_emission: best.date_emission,
        extrait_poursuites_extraction_method: "ai_auto_scan",
        extrait_poursuites_document_id: best.document_id,
        extrait_poursuites_ai_confidence: best.confidence,
      })
      .eq("id", client_id);

    if (updateErr) {
      console.error("Update client failed:", updateErr);
      return jsonResponse({ ok: false, error: "Sauvegarde échouée" }, 500);
    }

    return jsonResponse({
      ok: true,
      date_emission: best.date_emission,
      confidence: best.confidence,
      document_id: best.document_id,
      office_canton: best.office_canton ?? null,
      nom_personne: best.nom_personne ?? null,
      total_scanned: scanned,
      total_extracts: total,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("extract-poursuites-date error:", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
