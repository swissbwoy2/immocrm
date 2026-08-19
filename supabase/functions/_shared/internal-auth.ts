// Garde d'accès pour les fonctions "internes" (déclencheurs SQL, cron,
// actions staff) qui ne doivent pas être invocables anonymement.
// Accepte :
//  - la clé service_role (déclencheurs SQL / cron)
//  - un secret partagé via l'en-tête x-internal-secret (INTERNAL_FUNCTION_SECRET)
//  - un JWT utilisateur valide appartenant à un rôle staff (admin/agent/coursier)
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAFF_ROLES = ["admin", "agent", "coursier", "closeur", "automation_operator"];

export interface InternalAuthResult {
  ok: boolean;
  kind: "service" | "secret" | "staff" | "none";
  userId?: string;
  roles?: string[];
}

export async function verifyInternalCaller(req: Request): Promise<InternalAuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  // Secours temporaire : accepte aussi le secret partage present dans le repo/trigger,
  // le temps de resynchroniser INTERNAL_FUNCTION_SECRET (a faire tourner ensuite pour re-securiser).
  const FALLBACK_INTERNAL_SECRET = "ef380b1c3affa0aa4c7c82e0caa65707744824158a64ef75";

  const headerSecret = req.headers.get("x-internal-secret");
  if (headerSecret && (headerSecret === internalSecret || headerSecret === FALLBACK_INTERNAL_SECRET)) {
    return { ok: true, kind: "secret" };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, kind: "none" };

  if (token === serviceKey) return { ok: true, kind: "service" };

  const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return { ok: false, kind: "none" };

  const svc = createClient(supabaseUrl, serviceKey);
  const { data: rows } = await svc.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (rows || []).map((r: any) => r.role);
  if (roles.some((r: string) => STAFF_ROLES.includes(r))) {
    return { ok: true, kind: "staff", userId: user.id, roles };
  }
  return { ok: false, kind: "none", userId: user.id, roles };
}

/** Renvoie une 401/403 si l'appelant n'est pas autorisé, sinon null. */
export async function denyIfNotInternal(
  req: Request,
  corsHeaders: Record<string, string>,
  fnName: string,
  opts?: { allowAnyAuthenticated?: boolean },
): Promise<Response | null> {
  const res = await verifyInternalCaller(req);
  if (res.ok) return null;
  if (opts?.allowAnyAuthenticated && res.userId) return null;
  console.error(`${fnName}: appel non autorisé`, { kind: res.kind, userId: res.userId });
  return new Response(JSON.stringify({ error: "Non autorisé" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
