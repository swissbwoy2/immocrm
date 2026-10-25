// Steeve, lot 2 : répond aux messages des clients pilotes (lecture seule + transmission à l'agent).
// Appelée par le déclencheur trg_steeve_dispatch_client_message (pg_net, clé de service) avec { run_id }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";
import { anthropicCaller } from "../_shared/steeve/anthropic.ts";
import { runTurn } from "../_shared/steeve/engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = await denyIfNotInternal(req, corsHeaders, "steeve-turn");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const runId = typeof body?.run_id === "string" ? body.run_id : null;
  if (!runId) {
    return new Response(JSON.stringify({ error: "run_id manquant" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  const result = await runTurn({ db, runId, callModel: apiKey ? anthropicCaller(apiKey) : null });
  console.log("[steeve-turn]", runId, JSON.stringify(result));
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
