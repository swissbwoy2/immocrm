// Shared access-control helpers for LiveKit calls.
// Room naming convention: call:{conversationId}  (Phase B may add visit:{visiteId})

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type CallRole = "admin" | "agent" | "coursier" | "client" | "proprietaire" | "unknown";

export const HOST_ROLES: CallRole[] = ["admin", "agent", "coursier"];

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export async function resolveRole(svc: SupabaseClient, userId: string): Promise<CallRole> {
  const { data } = await svc.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data || []).map((r: any) => r.role as string);
  for (const r of ["admin", "agent", "coursier", "proprietaire", "client"]) {
    if (roles.includes(r)) return r as CallRole;
  }
  return "unknown";
}

export async function getDisplayName(svc: SupabaseClient, userId: string): Promise<string> {
  const { data } = await svc
    .from("profiles")
    .select("prenom, nom")
    .eq("id", userId)
    .maybeSingle();
  const name = `${data?.prenom || ""} ${data?.nom || ""}`.trim();
  return name || "Participant";
}

export function parseRoom(room: string): { kind: string; id: string } | null {
  const idx = room.indexOf(":");
  if (idx <= 0) return null;
  return { kind: room.slice(0, idx), id: room.slice(idx + 1) };
}

/**
 * Can `userId` join the call room of `conversationId`?
 * Legit participants: admins, the client of the conversation, the conversation's
 * agent(s) (direct or via conversation_agents), the admin_user_id, and any user
 * explicitly invited by a host (call_participants).
 */
export async function canAccessConversation(
  svc: SupabaseClient,
  userId: string,
  role: CallRole,
  conversationId: string,
): Promise<boolean> {
  if (role === "admin") return true;

  const { data: conv } = await svc
    .from("conversations")
    .select("id, client_id, agent_id, admin_user_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return false;

  if (conv.admin_user_id && conv.admin_user_id === userId) return true;

  // Client side
  if (conv.client_id) {
    const { data: cli } = await svc
      .from("clients")
      .select("id")
      .eq("id", conv.client_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (cli) return true;
  }

  // Agent side
  const { data: ag } = await svc
    .from("agents")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (ag) {
    if (conv.agent_id && conv.agent_id === ag.id) return true;
    const { data: ca } = await svc
      .from("conversation_agents")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("agent_id", ag.id)
      .maybeSingle();
    if (ca) return true;
  }

  // Explicitly invited participant (coursier, extra agent, ...)
  const { data: cp } = await svc
    .from("call_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (cp) return true;

  return false;
}

/** Deep link used in call notifications, per role. */
export function callLink(role: CallRole, conversationId: string): string {
  const base =
    role === "admin"
      ? "/admin/messagerie"
      : role === "agent"
        ? "/agent/messagerie"
        : role === "proprietaire"
          ? "/proprietaire/messagerie"
          : "/client/messagerie";
  return `${base}?conversationId=${conversationId}&call=${conversationId}`;
}
