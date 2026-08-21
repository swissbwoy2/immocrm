import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

function requestIdentity(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    forwarded ||
    "unknown"
  );
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function enforceRateLimit(
  admin: SupabaseClient,
  req: Request,
  corsHeaders: Record<string, string>,
  scope: string,
  options: { maxRequests: number; windowSeconds: number },
): Promise<Response | null> {
  const identityHash = await sha256(`${scope}:${requestIdentity(req)}`);
  const { data, error } = await admin.rpc("consume_edge_rate_limit", {
    p_scope: scope,
    p_identity_hash: identityHash,
    p_window_seconds: options.windowSeconds,
    p_max_requests: options.maxRequests,
  });

  if (error) {
    console.error(`${scope}: rate limit indisponible`);
    return new Response(JSON.stringify({ error: "Service temporairement indisponible" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }
  if (data !== true) {
    return new Response(JSON.stringify({ error: "Trop de tentatives" }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(options.windowSeconds),
      },
    });
  }
  return null;
}
