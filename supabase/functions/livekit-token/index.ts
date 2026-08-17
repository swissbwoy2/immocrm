import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.9.7";
import {
  corsHeaders,
  json,
  serviceClient,
  getAuthUser,
  resolveRole,
  getDisplayName,
  parseRoom,
  canAccessConversation,
  callLink,
  HOST_ROLES,
} from "../_shared/livekit-access.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL");
    const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
    const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return json({ error: "LiveKit non configuré (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)" }, 500);
    }

    const user = await getAuthUser(req);
    if (!user) {
      console.error("livekit-token: pas d'utilisateur (Authorization manquant ou JWT invalide)");
      return json({ error: "Session expirée : reconnecte-toi pour rejoindre l'appel." }, 401);
    }

    const { room, mode = "video", notify = false } = await req.json();
    if (!room || typeof room !== "string") {
      console.error("livekit-token: room manquante", { userId: user.id });
      return json({ error: "Appel introuvable : identifiant de conversation manquant." }, 400);
    }

    const parsed = parseRoom(room);
    if (!parsed || parsed.kind !== "call") {
      console.error("livekit-token: room invalide", room);
      return json({ error: `Salle d'appel invalide (${room})` }, 400);
    }
    const conversationId = parsed.id;

    const svc = serviceClient();
    const role = await resolveRole(svc, user.id);

    const allowed = await canAccessConversation(svc, user.id, role, conversationId);
    if (!allowed) {
      console.error("livekit-token: accès refusé", { userId: user.id, role, conversationId });
      return json({ error: "Accès refusé à cet appel (vous n'êtes pas rattaché à cette conversation)" }, 403);
    }


    const isHost = HOST_ROLES.includes(role);
    const name = await getDisplayName(svc, user.id);

    // Identité unique par session : évite qu'un même compte ouvert sur 2 appareils
    // se déconnecte mutuellement (LiveKit expulse les identités dupliquées).
    const identity = `${user.id}#${crypto.randomUUID().slice(0, 8)}`;

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name,
      ttl: 60 * 60, // 1h
      metadata: JSON.stringify({ role, host: isHost, userId: user.id }),
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
      roomCreate: isHost,
    });

    const token = await at.toJwt();

    // Notify the other legit participants that a call is starting
    if (notify) {
      try {
        const targets = await collectConversationUserIds(svc, conversationId);
        const rows = targets
          .filter((t) => t.userId !== user.id)
          .map((t) => ({
            user_id: t.userId,
            type: "call_incoming",
            title: mode === "audio" ? "Appel audio entrant" : "Appel vidéo entrant",
            message: `${name} vous appelle`,
            link: callLink(t.role, conversationId, mode),
            metadata: { conversationId, mode, from: user.id, room },
          }));
        if (rows.length) await svc.from("notifications").insert(rows);
      } catch (e) {
        console.error("notify failed", e);
      }
    }

    return json({ token, url: LIVEKIT_URL, identity, name, role, isHost, room });
  } catch (e) {
    console.error("livekit-token error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function collectConversationUserIds(
  svc: ReturnType<typeof serviceClient>,
  conversationId: string,
): Promise<{ userId: string; role: any }[]> {
  const out: { userId: string; role: any }[] = [];
  const { data: conv } = await svc
    .from("conversations")
    .select("client_id, agent_id, admin_user_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return out;

  if (conv.admin_user_id) out.push({ userId: conv.admin_user_id, role: "admin" });

  if (conv.client_id) {
    const { data: cli } = await svc.from("clients").select("user_id").eq("id", conv.client_id).maybeSingle();
    if (cli?.user_id) out.push({ userId: cli.user_id, role: "client" });
  }

  const agentIds: string[] = [];
  if (conv.agent_id) agentIds.push(conv.agent_id);
  const { data: cas } = await svc
    .from("conversation_agents")
    .select("agent_id")
    .eq("conversation_id", conversationId);
  (cas || []).forEach((c: any) => c.agent_id && agentIds.push(c.agent_id));
  if (agentIds.length) {
    const { data: ags } = await svc.from("agents").select("user_id").in("id", agentIds);
    (ags || []).forEach((a: any) => a.user_id && out.push({ userId: a.user_id, role: "agent" }));
  }

  const { data: invited } = await svc
    .from("call_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);
  for (const p of invited || []) {
    if (!p.user_id) continue;
    const r = await resolveRole(svc, p.user_id);
    out.push({ userId: p.user_id, role: r });
  }

  // dedupe
  const seen = new Set<string>();
  return out.filter((o) => (seen.has(o.userId) ? false : (seen.add(o.userId), true)));
}
