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

    // Vérification rôle admin/agent
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const userRoles = (roles ?? []).map((r: any) => r.role);
    const isAdmin = userRoles.includes("admin");
    const isAgent = userRoles.includes("agent");
    if (!isAdmin && !isAgent) return jsonResponse({ ok: false, error: "Accès refusé (admin/agent uniquement)" }, 403);

    const body = await req.json().catch(() => ({}));
    const mode: "missing" | "all" = body.mode === "all" ? "all" : "missing";
    const limit = Math.min(typeof body.limit === "number" ? body.limit : 50, 50);
    // Si l'appelant est agent (ou demande explicite), restreindre à SES clients
    const agentScope = body.agent_scope === true || (!isAdmin && isAgent);

    // Si agent_scope : récupérer les IDs clients assignés à l'agent
    let agentClientIdsFilter: Set<string> | null = null;
    if (agentScope) {
      const { data: agentRow } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!agentRow?.id) {
        return jsonResponse({ ok: true, mode, total: 0, success: 0, failed: 0, results: [] });
      }
      const ids = new Set<string>();
      const { data: direct } = await supabase
        .from("clients").select("id").eq("agent_id", agentRow.id).limit(15000);
      (direct ?? []).forEach((c: any) => ids.add(c.id));
      const { data: junction } = await supabase
        .from("client_agents").select("client_id").eq("agent_id", agentRow.id).limit(15000);
      (junction ?? []).forEach((c: any) => ids.add(c.client_id));
      agentClientIdsFilter = ids;
    }

    // 1) Récupérer tous les clients actifs
    const { data: clientsData, error: clientsErr } = await supabase
      .from("clients")
      .select("id, extrait_poursuites_date_emission, extrait_poursuites_extraction_method")
      .eq("statut", "actif")
      .limit(15000);

    if (clientsErr) {
      console.error("clients query error:", clientsErr);
      return jsonResponse({ ok: false, error: clientsErr.message }, 500);
    }

    // 2) Récupérer la liste des client_id ayant au moins 1 extrait uploadé
    const { data: extractDocs, error: docsErr } = await supabase
      .from("documents")
      .select("client_id")
      .eq("type_document", "extrait_poursuites")
      .limit(15000);

    if (docsErr) {
      console.error("documents query error:", docsErr);
      return jsonResponse({ ok: false, error: docsErr.message }, 500);
    }

    const clientsWithExtract = new Set<string>(
      (extractDocs ?? []).map((d: any) => d.client_id).filter(Boolean),
    );

    let candidates = (clientsData ?? []).filter((c: any) => clientsWithExtract.has(c.id));

    // Filtre agent : ne garder que les clients assignés
    if (agentClientIdsFilter) {
      candidates = candidates.filter((c: any) => agentClientIdsFilter!.has(c.id));
    }

    if (mode === "missing") {
      candidates = candidates.filter((c) => !c.extrait_poursuites_date_emission);
    }
    // Ne jamais écraser une saisie manuelle/agent
    candidates = candidates.filter(
      (c) =>
        !["manual", "agent"].includes(c.extrait_poursuites_extraction_method ?? ""),
    );

    candidates = candidates.slice(0, limit);

    console.log(`[batch] Mode=${mode} | agentScope=${agentScope} | Candidats: ${candidates.length}`);

    const results: Array<{
      client_id: string;
      ok: boolean;
      date_emission?: string;
      confidence?: number;
      error?: string;
    }> = [];

    let success = 0;
    let failed = 0;

    for (const client of candidates) {
      try {
        const { best } = await scanClientExtracts(supabase, client.id, lovableKey);

        if (best) {
          const { error: updErr } = await supabase
            .from("clients")
            .update({
              extrait_poursuites_date_emission: best.date_emission,
              extrait_poursuites_extraction_method: "ai_auto_scan",
              extrait_poursuites_document_id: best.document_id,
              extrait_poursuites_ai_confidence: best.confidence,
            })
            .eq("id", client.id);

          if (updErr) {
            console.error(`[batch] Update failed ${client.id}:`, updErr);
            failed++;
            results.push({ client_id: client.id, ok: false, error: updErr.message });
          } else {
            success++;
            results.push({
              client_id: client.id,
              ok: true,
              date_emission: best.date_emission,
              confidence: best.confidence,
            });
            console.log(`[batch] ✅ ${client.id} → ${best.date_emission} (${Math.round(best.confidence * 100)}%)`);
          }
        } else {
          failed++;
          results.push({ client_id: client.id, ok: false, error: "Aucune date détectable" });
          console.log(`[batch] ⚠️ ${client.id} → aucune date détectable`);
        }
      } catch (e: any) {
        failed++;
        results.push({ client_id: client.id, ok: false, error: e?.message ?? String(e) });
        console.error(`[batch] ❌ ${client.id}:`, e);
      }

      // Délai pour éviter rate limit
      await new Promise((r) => setTimeout(r, 800));
    }

    return jsonResponse({
      ok: true,
      mode,
      total: candidates.length,
      success,
      failed,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("extract-poursuites-batch error:", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
