import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "invalid body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      anonymous_id,
      categories,
      policy_version,
      source,
    } = body as {
      anonymous_id?: string;
      categories?: Record<string, boolean>;
      policy_version?: string;
      source?: string;
    };

    if (
      !categories ||
      typeof categories !== "object" ||
      typeof policy_version !== "string" ||
      policy_version.length === 0 ||
      policy_version.length > 32
    ) {
      return new Response(JSON.stringify({ error: "invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const required = ["necessary", "analytics", "marketing", "personalization"];
    for (const k of required) {
      if (typeof (categories as any)[k] !== "boolean") {
        return new Response(JSON.stringify({ error: `invalid category: ${k}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "";
    const ip_hash = ip ? await sha256(ip + ":" + policy_version) : null;
    const ua = req.headers.get("user-agent") ?? "";

    // Try to recover user_id from JWT (optional)
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabaseAuthClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data } = await supabaseAuthClient.auth.getUser();
        user_id = data.user?.id ?? null;
      } catch {
        // ignore
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabaseAdmin
      .from("cookie_consent_logs")
      .insert({
        user_id,
        anonymous_id: anonymous_id ?? null,
        ip_hash,
        user_agent: ua.slice(0, 500),
        categories,
        policy_version,
        source: source ?? "banner",
      });

    if (error) {
      console.error("insert error", error);
      return new Response(JSON.stringify({ error: "insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("log-cookie-consent error", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
