import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  ok: boolean;
  userId?: string;
  admin?: SupabaseClient;
  response?: Response;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Verifies the request bearer token belongs to an authenticated user.
 * If `requireAdmin` is true, also checks the caller has the `admin` role in `user_roles`.
 * Returns an admin (service-role) Supabase client on success.
 */
export async function requireAuth(req: Request, opts: { requireAdmin?: boolean } = {}): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader) {
    return { ok: false, response: jsonError(401, "Authentification requise") };
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");

  const userClient = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, response: jsonError(401, "Session invalide") };
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (opts.requireAdmin) {
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return { ok: false, response: jsonError(403, "Accès refusé") };
    }
  }

  return { ok: true, userId: userData.user.id, admin };
}
