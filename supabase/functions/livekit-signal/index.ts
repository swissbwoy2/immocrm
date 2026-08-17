import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  json,
  serviceClient,
  getAuthUser,
  resolveRole,
  getDisplayName,
  canAccessConversation,
  messagerieLink,
} from "../_shared/livekit-access.ts";

/**
 * Signalisation d'appel (hors média) :
 *  - { conversationId, action: "declined" | "missed", to?: userId }
 * Notifie l'appelant (ou tous les autres participants) que l'appel a été
 * refusé / manqué. Les notifications ne sont insérables qu'en service_role,
 * d'où cette fonction.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return json({ error: "Session expirée : reconnecte-toi." }, 401);

    const { conversationId, action = "declined", to } = await req.json();
    if (!conversationId) return json({ error: "conversationId manquant" }, 400);
    if (action !== "declined" && action !== "missed") {
      return json({ error: "Action inconnue" }, 400);
    }

    const svc = serviceClient();
    const role = await resolveRole(svc, user.id);
    const allowed = await canAccessConversation(svc, user.id, role, conversationId);
    if (!allowed) {
      console.error("livekit-signal: accès refusé", { userId: user.id, role, conversationId });
      return json({ error: "Accès refusé à cette conversation" }, 403);
    }

    const name = await getDisplayName(svc, user.id);

    let targets: string[] = [];
    if (typeof to === "string" && to) {
      targets = [to];
    } else {
      const { data: conv } = await svc
        .from("conversations")
        .select("client_id, agent_id, admin_user_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv?.admin_user_id) targets.push(conv.admin_user_id);
      if (conv?.client_id) {
        const { data: cli } = await svc
          .from("clients")
          .select("user_id")
          .eq("id", conv.client_id)
          .maybeSingle();
        if (cli?.user_id) targets.push(cli.user_id);
      }
    }
    targets = [...new Set(targets.filter((t) => t && t !== user.id))];
    if (!targets.length) return json({ ok: true, notified: 0 });

    const rows = await Promise.all(
      targets.map(async (userId) => {
        const r = await resolveRole(svc, userId);
        return {
          user_id: userId,
          type: action === "declined" ? "call_declined" : "call_missed",
          title: action === "declined" ? "Appel refusé" : "Appel manqué",
          message:
            action === "declined"
              ? `${name} n'a pas pu répondre à votre appel`
              : `${name} n'a pas répondu`,
          link: `${messagerieLink(r)}?conversationId=${conversationId}`,
          metadata: { conversationId, from: user.id },
        };
      }),
    );

    const { error } = await svc.from("notifications").insert(rows);
    if (error) {
      console.error("livekit-signal: insert notifications", error);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, notified: rows.length });
  } catch (e) {
    console.error("livekit-signal error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
