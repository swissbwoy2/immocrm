// Steeve sur le site public (visiteurs non connectés). Appel depuis le navigateur, sans compte.
// Garde-fous : origines autorisées, tailles bornées, limites par session et par IP, plafond de dépense,
// aucune donnée de client accessible (voir _shared/steeve/public-prompt.ts).
import { createClient } from "npm:@supabase/supabase-js@2";
import { anthropicCaller } from "../_shared/steeve/anthropic.ts";
import { handlePublicChat } from "../_shared/steeve/public-chat.ts";

const ALLOWED_ORIGIN = /^https:\/\/((www\.)?logisorama\.ch|[a-z0-9-]+\.lovable\.app|[a-z0-9-]+\.lovableproject\.com)$/i;

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGIN.test(origin) ? origin : "https://logisorama.ch",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST" || !origin || !ALLOWED_ORIGIN.test(origin)) {
    return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403, headers });
  }
  const length = Number(req.headers.get("content-length") || "0");
  if (length > 20_000) return new Response(JSON.stringify({ error: "Message trop long" }), { status: 413, headers });

  const body = await req.json().catch(() => null);
  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";
  const salt = Deno.env.get("INTERNAL_FUNCTION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "steeve";

  const result = await handlePublicChat({ db, callModel: apiKey ? anthropicCaller(apiKey) : null, body, ip, salt });
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
});
