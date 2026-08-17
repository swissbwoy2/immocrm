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

  const { data: conv, error: convErr } = await svc
    .from("conversations")
    .select("id, client_id, agent_id, admin_user_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (convErr) console.error("canAccessConversation: conversation lookup failed", convErr.message);
  if (!conv) {
    console.error("canAccessConversation: conversation introuvable", conversationId);
    return false;
  }

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

  // Agent side : agent de la conversation, co-agent (conversation_agents)
  // ou agent rattaché au client (client_agents / clients.agent_id).
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
    if (conv.client_id) {
      const { data: cag } = await svc
        .from("client_agents")
        .select("id")
        .eq("client_id", conv.client_id)
        .eq("agent_id", ag.id)
        .maybeSingle();
      if (cag) return true;
      const { data: cli2 } = await svc
        .from("clients")
        .select("id")
        .eq("id", conv.client_id)
        .eq("agent_id", ag.id)
        .maybeSingle();
      if (cli2) return true;
    }
  }

  // Coursier : rattaché à une visite du client du dossier
  if (role === "coursier" && conv.client_id) {
    const { data: cou } = await svc
      .from("coursiers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (cou) {
      const { data: vis } = await svc
        .from("visites")
        .select("id")
        .eq("client_id", conv.client_id)
        .eq("coursier_id", cou.id)
        .limit(1);
      if (vis && vis.length > 0) return true;
    }
  }

  // Explicitly invited participant (coursier, extra agent, ...)
  const { data: cp } = await svc
    .from("call_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (cp) return true;

  console.error("canAccessConversation: accès refusé", { userId, role, conversationId });
  return false;
}


/** Deep link used in call notifications, per role. */
export function callLink(role: CallRole, conversationId: string, mode?: string): string {
  // Route universelle déclarée pour TOUS les rôles dans le routeur React :
  // aucun lien d'appel ne peut donc tomber sur une 404 (y compris coursier).
  const suffix = mode ? `&mode=${mode}` : "";
  return `/appel?call=${conversationId}&conversationId=${conversationId}${suffix}`;
}

/** Lien vers la messagerie du rôle (appel refusé / manqué). */
export function messagerieLink(role: CallRole): string {
  return role === "admin"
    ? "/admin/messagerie"
    : role === "agent"
      ? "/agent/messagerie"
      : role === "proprietaire"
        ? "/proprietaire/messagerie"
        : "/client/messagerie";
}

// ---------------------------------------------------------------------------
// PHASE B — Live de visite (room `visit:{visiteId}`)
// ---------------------------------------------------------------------------

export interface VisitAccess {
  allowed: boolean;
  /** Hôte = admin / agent / coursier rattaché à la visite : peut publier & piloter. */
  isHost: boolean;
  /** Toutes les lignes de visite du même créneau/adresse (visites groupées). */
  visiteIds: string[];
  clientIds: string[];
}

const DENY: VisitAccess = { allowed: false, isHost: false, visiteIds: [], clientIds: [] };

/**
 * Récupère la visite + le groupe de visites (même adresse & même horaire),
 * car une visite physique est stockée en une ligne par client.
 */
export async function loadVisitGroup(svc: SupabaseClient, visiteId: string) {
  const { data: v } = await svc
    .from("visites")
    .select("id, client_id, agent_id, coursier_id, adresse, date_visite")
    .eq("id", visiteId)
    .maybeSingle();
  if (!v) return null;

  let group: any[] = [v];
  if (v.adresse && v.date_visite) {
    const { data: g } = await svc
      .from("visites")
      .select("id, client_id, agent_id, coursier_id")
      .eq("adresse", v.adresse)
      .eq("date_visite", v.date_visite)
      .limit(50);
    if (g && g.length) group = g;
  }
  return { visite: v, group };
}

/** Qui peut rejoindre le live d'une visite, et à quel titre (hôte / spectateur) ? */
export async function resolveVisitAccess(
  svc: SupabaseClient,
  userId: string,
  role: CallRole,
  visiteId: string,
): Promise<VisitAccess> {
  const loaded = await loadVisitGroup(svc, visiteId);
  if (!loaded) {
    console.error("resolveVisitAccess: visite introuvable", visiteId);
    return DENY;
  }
  const { group } = loaded;
  const visiteIds = group.map((g: any) => g.id);
  const clientIds = [...new Set(group.map((g: any) => g.client_id).filter(Boolean))] as string[];

  if (role === "admin") return { allowed: true, isHost: true, visiteIds, clientIds };

  if (role === "agent") {
    const { data: ag } = await svc.from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (ag) {
      if (group.some((g: any) => g.agent_id === ag.id)) {
        return { allowed: true, isHost: true, visiteIds, clientIds };
      }
      if (clientIds.length) {
        const { data: cag } = await svc
          .from("client_agents")
          .select("id")
          .eq("agent_id", ag.id)
          .in("client_id", clientIds)
          .limit(1);
        if (cag && cag.length) return { allowed: true, isHost: true, visiteIds, clientIds };
        const { data: cli } = await svc
          .from("clients")
          .select("id")
          .eq("agent_id", ag.id)
          .in("id", clientIds)
          .limit(1);
        if (cli && cli.length) return { allowed: true, isHost: true, visiteIds, clientIds };
      }
    }
  }

  if (role === "coursier") {
    const { data: cou } = await svc.from("coursiers").select("id").eq("user_id", userId).maybeSingle();
    if (cou && group.some((g: any) => g.coursier_id === cou.id)) {
      return { allowed: true, isHost: true, visiteIds, clientIds };
    }
  }

  // Client concerné par la visite : spectateur (jamais hôte).
  if (clientIds.length) {
    const { data: me } = await svc
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .in("id", clientIds)
      .limit(1);
    if (me && me.length) return { allowed: true, isHost: false, visiteIds, clientIds };
  }

  console.error("resolveVisitAccess: accès refusé", { userId, role, visiteId });
  return { ...DENY, visiteIds, clientIds };
}

/** Lien universel vers le live d'une visite (route /appel, tous rôles). */
export function visitLiveLink(visiteId: string): string {
  return `/appel?visit=${visiteId}&mode=video`;
}
