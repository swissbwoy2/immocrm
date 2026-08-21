// Garde d'accès pour les fonctions internes (déclencheurs SQL, cron et actions staff).
// Les seuls mécanismes acceptés sont :
//  - la clé service_role ;
//  - INTERNAL_FUNCTION_SECRET via x-internal-secret ;
//  - un JWT utilisateur valide appartenant à un rôle staff.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAFF_ROLES = ["admin", "agent", "coursier", "closeur", "automation_operator"];

export interface InternalAuthResult {
  ok: boolean;
  kind: "service" | "secret" | "staff" | "authenticated" | "none";
  userId?: string;
  roles?: string[];
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const maxLength = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < maxLength; i += 1) {
    mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return mismatch === 0;
}

export async function verifyInternalCaller(req: Request): Promise<InternalAuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

  const headerSecret = req.headers.get("x-internal-secret")?.trim() ?? "";
  if (headerSecret && internalSecret && constantTimeEqual(headerSecret, internalSecret)) {
    return { ok: true, kind: "secret" };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, kind: "none" };

  if (serviceKey && constantTimeEqual(token, serviceKey)) {
    return { ok: true, kind: "service" };
  }

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("internal-auth: configuration Supabase incomplète");
    return { ok: false, kind: "none" };
  }

  const anon = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await anon.auth.getUser();
  if (userError || !user) return { ok: false, kind: "none" };

  const svc = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: rows, error: roleError } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (roleError) {
    console.error("internal-auth: lecture des rôles impossible", { userId: user.id });
    return { ok: false, kind: "authenticated", userId: user.id, roles: [] };
  }

  const roles = (rows || []).map((row: { role: string }) => row.role);
  if (roles.some((role: string) => STAFF_ROLES.includes(role))) {
    return { ok: true, kind: "staff", userId: user.id, roles };
  }
  return { ok: false, kind: "authenticated", userId: user.id, roles };
}

/** Renvoie une 401/403 si l'appelant n'est pas autorisé, sinon null. */
export async function denyIfNotInternal(
  req: Request,
  corsHeaders: Record<string, string>,
  fnName: string,
  opts?: { allowAnyAuthenticated?: boolean },
): Promise<Response | null> {
  const result = await verifyInternalCaller(req);
  if (result.ok) return null;
  if (opts?.allowAnyAuthenticated && result.userId) return null;

  const status = result.userId ? 403 : 401;
  console.error(`${fnName}: appel non autorisé`, { kind: result.kind, userId: result.userId });
  return new Response(JSON.stringify({ error: "Non autorisé" }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
