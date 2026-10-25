// Steeve sur le site public (visiteurs non connectés). Appel depuis le navigateur, sans compte.
// Garde-fous : origines autorisées, tailles bornées, limites par session et par IP, plafond de dépense,
// aucune donnée de client accessible (voir _shared/steeve/public-prompt.ts).
import { createClient } from "npm:@supabase/supabase-js@2";
import { anthropicCaller } from "../_shared/steeve/anthropic.ts";
import { handlePublicChat } from "../_shared/steeve/public-chat.ts";

// Site public et aperçus Lovable de CE projet uniquement.
const ALLOWED_ORIGIN = /^https:\/\/((www\.)?logisorama\.ch|id-preview--f4e29d86-2c22-4626-ac70-fd341e0305cf\.lovable\.app|f4e29d86-2c22-4626-ac70-fd341e0305cf\.lovableproject\.com)$/i;
const MAX_BODY_BYTES = 20_000;

/** Corps lu avec un compteur : coupé au-delà de la limite, même sans Content-Length. */
async function readBody(req: Request): Promise<unknown | "trop_long"> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return "trop_long";
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(merged));
  } catch {
    return null;
  }
}

/** Adresse du visiteur posée par la plateforme (jamais la première valeur de X-Forwarded-For, que le visiteur peut écrire). */
function clientIp(req: Request): string {
  const platform = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (platform) return platform.trim();
  const forwarded = (req.headers.get("x-forwarded-for") || "").split(",").map((v) => v.trim()).filter(Boolean);
  return forwarded[forwarded.length - 1] || "";
}

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
  const body = await readBody(req);
  if (body === "trop_long") return new Response(JSON.stringify({ error: "Message trop long" }), { status: 413, headers });

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const ip = clientIp(req);
  const salt = Deno.env.get("INTERNAL_FUNCTION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "steeve";

  const result = await handlePublicChat({ db, callModel: apiKey ? anthropicCaller(apiKey) : null, body, ip, salt });
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
});
