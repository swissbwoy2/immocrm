import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  for (let i = 0; i < len; i++) {
    diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const botEmail = Deno.env.get("BOT_EMAIL") ?? "";
  const botPassword = Deno.env.get("BOT_PASSWORD") ?? "";
  const botKey = Deno.env.get("BOT_LOGIN_KEY") ?? "";

  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!botKey || !key || !safeEqual(key, botKey)) {
    return json(401, { error: "Unauthorized" });
  }

  if (!botEmail || !botPassword) {
    console.error("bot-login: configuration incomplète");
    return json(500, { error: "Configuration incomplète" });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1) S'assurer que le compte robot existe
    let botUserId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === botEmail.toLowerCase(),
    );

    if (existing) {
      botUserId = existing.id;
      // Aligner le mot de passe sur le secret courant (rotation possible à tout moment)
      await admin.auth.admin.updateUserById(existing.id, {
        password: botPassword,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: botEmail,
        password: botPassword,
        email_confirm: true,
        user_metadata: { bot: true },
      });
      if (createErr || !created?.user) {
        console.error("bot-login: création compte robot échouée");
        return json(500, { error: "Création du compte robot impossible" });
      }
      botUserId = created.user.id;
    }

    // 2) Rôle admin identique aux admins existants
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", botUserId);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: botUserId, role: "admin" });
      if (roleErr) {
        console.error("bot-login: attribution du rôle admin échouée");
        return json(500, { error: "Attribution du rôle admin impossible" });
      }
    }

    // 3) Connexion serveur → tokens renvoyés au navigateur
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
      email: botEmail,
      password: botPassword,
    });
    if (signInErr || !signIn?.session) {
      console.error("bot-login: connexion robot échouée");
      return json(500, { error: "Connexion robot impossible" });
    }

    return json(200, {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      expires_in: signIn.session.expires_in,
    });
  } catch (_e) {
    console.error("bot-login: erreur inattendue");
    return json(500, { error: "Erreur inattendue" });
  }
});
