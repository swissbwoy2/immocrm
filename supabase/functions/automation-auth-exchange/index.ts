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

/** Comparaison à temps constant (aucune fuite par timing). */
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  const len = Math.max(ea.length, eb.length);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < len; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const APP_ORIGIN = "https://logisorama.ch";
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const apiSecret = Deno.env.get("AUTOMATION_API_SECRET") ?? "";
  const botEmail = Deno.env.get("BOT_EMAIL") ?? "";
  const botPassword = Deno.env.get("BOT_PASSWORD") ?? "";

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 300);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const audit = async (outcome: "granted" | "denied" | "rate_limited") => {
    // Ni secret ni token n'est journalisé.
    await admin.from("automation_auth_log").insert({ ip, user_agent: userAgent, outcome });
  };

  // 1) Limitation de débit par IP
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await admin
    .from("automation_auth_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  if ((count ?? 0) >= RATE_LIMIT) {
    await audit("rate_limited");
    return json(429, { error: "Too many requests" });
  }

  // 2) Authentification uniquement par en-tête Authorization: Bearer
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!apiSecret || !bearer || !safeEqual(bearer, apiSecret)) {
    await audit("denied");
    return json(401, { error: "Unauthorized" });
  }

  if (!botEmail || !botPassword) {
    console.error("automation-auth-exchange: configuration incomplète");
    return json(500, { error: "Configuration incomplète" });
  }

  try {
    // 3) Compte robot : existence + rôle automation_operator (jamais admin)
    let botUserId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === botEmail.toLowerCase(),
    );

    if (existing) {
      botUserId = existing.id;
      await admin.auth.admin.updateUserById(existing.id, {
        password: botPassword,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: botEmail,
        password: botPassword,
        email_confirm: true,
        user_metadata: { automation: true },
      });
      if (createErr || !created?.user) {
        console.error("automation-auth-exchange: création compte robot échouée");
        return json(500, { error: "Création du compte robot impossible" });
      }
      botUserId = created.user.id;
    }

    // Révocation de tout rôle privilégié hérité, puis attribution du rôle limité.
    await admin.from("user_roles").delete().eq("user_id", botUserId).neq("role", "automation_operator");
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", botUserId);
    if (!(roles ?? []).some((r: { role: string }) => r.role === "automation_operator")) {
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: botUserId, role: "automation_operator" });
      if (roleErr) {
        console.error("automation-auth-exchange: attribution du rôle échouée");
        return json(500, { error: "Attribution du rôle impossible" });
      }
    }

    // 4) Code à usage unique, 60 s, stocké haché
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const codeHash = await sha256Hex(code);

    const { error: insertErr } = await admin.from("automation_login_codes").insert({
      code_hash: codeHash,
      bot_user_id: botUserId,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    if (insertErr) {
      console.error("automation-auth-exchange: création du code échouée");
      return json(500, { error: "Création du code impossible" });
    }

    await audit("granted");

    // Le code en clair n'est renvoyé qu'ici, jamais journalisé.
    return json(200, { login_url: `${APP_ORIGIN}/bot-login-code?code=${code}`, expires_in: 60 });
  } catch (_e) {
    console.error("automation-auth-exchange: erreur inattendue");
    return json(500, { error: "Erreur inattendue" });
  }
});
