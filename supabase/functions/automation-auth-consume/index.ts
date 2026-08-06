import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const botEmail = Deno.env.get("BOT_EMAIL") ?? "";
  const botPassword = Deno.env.get("BOT_PASSWORD") ?? "";

  let code = "";
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code.trim() : "";
  } catch {
    return json(400, { error: "Invalid body" });
  }
  if (!code || code.length > 256) return json(401, { error: "Unauthorized" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const codeHash = await sha256Hex(code);
    const nowIso = new Date().toISOString();

    // Consommation atomique : usage unique garanti par la clause is null + expiration.
    const { data: consumed, error: consumeErr } = await admin
      .from("automation_login_codes")
      .update({ used_at: nowIso })
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .select("id")
      .maybeSingle();

    if (consumeErr || !consumed) {
      return json(401, { error: "Unauthorized" });
    }

    if (!botEmail || !botPassword) {
      console.error("automation-auth-consume: configuration incomplète");
      return json(500, { error: "Configuration incomplète" });
    }

    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
      email: botEmail,
      password: botPassword,
    });
    if (signInErr || !signIn?.session) {
      console.error("automation-auth-consume: connexion robot échouée");
      return json(500, { error: "Connexion robot impossible" });
    }

    // Ni le code ni les jetons ne sont journalisés.
    return json(200, {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      expires_in: signIn.session.expires_in,
    });
  } catch (_e) {
    console.error("automation-auth-consume: erreur inattendue");
    return json(500, { error: "Erreur inattendue" });
  }
});
