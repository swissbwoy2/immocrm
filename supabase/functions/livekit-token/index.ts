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
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { room, mode = "video", notify = false } = await req.json();
    if (!room || typeof room !== "string") return json({ error: "room requis" }, 400);

    const parsed = parseRoom(room);
    if (!parsed || parsed.kind !== "call") return json({ error: "room invalide" }, 400);
    const conversationId = parsed.id;

    const svc = serviceClient();
    const role = await resolveRole(svc, user.id);

    const allowed = await canAccessConversation(svc, user.id, role, conversationId);
    if (!allowed) return json({ error: "Accès refusé à cet appel" }, 403);

    const isHost = HOST_ROLES.includes(role);
    const name = await getDisplayName(svc, user.id);

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: user.id,
      name,
      ttl: 60 * 60, // 1h
      metadata: JSON.stringify({ role, host: isHost }),
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
            link: callLink(t.role, conversationId),
            metadata: { conversationId, mode, from: user.id, room },
          }));
        if (rows.length) await svc.from("notifications").insert(rows);
      } catch (e) {
        console.error("notify failed", e);
      }
    }

    return json({ token, url: LIVEKIT_URL, identity: user.id, name, role, isHost, room });
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
  (invited || []).forEach((p: any) => out.push({ userId: p.user_id, role: "client" }));

  // dedupe
  const seen = new Set<string>();
  return out.filter((o) => (seen.has(o.userId) ? false : (seen.add(o.userId), true)));
}
