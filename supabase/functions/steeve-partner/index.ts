// Steeve des propriétaires, annonceurs et apporteurs. Appel depuis leur espace avec leur session.
// Garde-fous : utilisateur authentifié avec un rôle partenaire (vérifié en base), plafonds, outils en lecture seule
// exécutés avec sa session (chaque fonction ne lit que ses données). Voir _shared/steeve/partner-chat.ts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { anthropicCaller } from "../_shared/steeve/anthropic.ts";
import { handlePartnerChat } from "../_shared/steeve/partner-chat.ts";

const ALLOWED_ORIGIN = /^https:\/\/((www\.)?logisorama\.ch|id-preview--f4e29d86-2c22-4626-ac70-fd341e0305cf\.lovable\.app|f4e29d86-2c22-4626-ac70-fd341e0305cf\.lovableproject\.com)$/i;
const MAX_BODY_BYTES = 60_000;

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
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST" || (origin && !ALLOWED_ORIGIN.test(origin))) return reply(403, { error: "Accès refusé" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return reply(401, { error: "Connexion requise" });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const userDb = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData } = await userDb.auth.getUser();
  const user = userData?.user;
  if (!user) return reply(401, { error: "Connexion requise" });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return reply(413, { error: "Message trop long" });
  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { return reply(400, { error: "Requête invalide" }); }

  const serviceDb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const result = await handlePartnerChat({
    serviceDb, userDb, userId: user.id, body,
    callModel: apiKey ? anthropicCaller(apiKey) : null,
  });
  return reply(result.status, result.body);
});
