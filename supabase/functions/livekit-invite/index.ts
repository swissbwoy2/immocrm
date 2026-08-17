import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  json,
  serviceClient,
  getAuthUser,
  resolveRole,
  getDisplayName,
  canAccessConversation,
  callLink,
  HOST_ROLES,
  resolveVisitAccess,
  visitLiveLink,
} from "../_shared/livekit-access.ts";

/**
 * Invite a user into an existing call room, or into a visit live (`visiteId`).
 * ABSOLUTE RULE: only admin / agent / coursier can invite. Clients get 403.
 * Actions:
 *  - { action: "candidates", conversationId | visiteId } -> people linked
 *  - { action: "invite", conversationId | visiteId, userId, mode } -> notify
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) {
      console.error("livekit-invite: Authorization manquant ou JWT invalide");
      return json({ error: "Session expirée : reconnecte-toi." }, 401);
    }

    const body = await req.json();
    const action = body.action || "invite";
    const conversationId: string = body.conversationId;
    const visiteId: string | undefined = body.visiteId;

    const svc = serviceClient();
    const role = await resolveRole(svc, user.id);

    if (!HOST_ROLES.includes(role)) {
      console.error("livekit-invite: rôle non autorisé", { userId: user.id, role });
      return json({ error: "Seuls un admin, un agent ou un coursier peuvent inviter" }, 403);
    }

    // ---------- LIVE DE VISITE ---------------------------------------------
    if (visiteId) {
      const access = await resolveVisitAccess(svc, user.id, role, visiteId);
      if (!access.allowed || !access.isHost) {
        return json({ error: "Vous n'êtes pas hôte de ce live" }, 403);
      }

      if (action === "candidates") {
        const candidates: { user_id: string; name: string; role: string }[] = [];
        const push = (user_id: string | null | undefined, name: string, r: string) => {
          if (!user_id || user_id === user.id) return;
          if (candidates.some((x) => x.user_id === user_id)) return;
          candidates.push({ user_id, name, role: r });
        };

        // Clients concernés par la visite (nom via profiles : la table clients
        // ne porte pas prenom/nom).
        if (access.clientIds.length) {
          const { data: clis, error: cliErr } = await svc
            .from("clients")
            .select("id, user_id")
            .in("id", access.clientIds);
          if (cliErr) console.error("livekit-invite: clients lookup", cliErr.message);
          for (const c of clis || []) {
            if (!c.user_id) continue;
            push(c.user_id, await getDisplayName(svc, c.user_id), "client");
          }
        }

        // Agents et coursiers rattachés au créneau de visite.
        const loaded = await loadVisitGroup(svc, visiteId);
        const agentIds = [...new Set((loaded?.group || []).map((g: any) => g.agent_id).filter(Boolean))];
        const coursierIds = [
          ...new Set((loaded?.group || []).map((g: any) => g.coursier_id).filter(Boolean)),
        ];
        if (agentIds.length) {
          const { data: ags } = await svc.from("agents").select("user_id").in("id", agentIds);
          for (const a of ags || []) push(a.user_id, await getDisplayName(svc, a.user_id), "agent");
        }
        if (coursierIds.length) {
          const { data: cous } = await svc.from("coursiers").select("user_id").in("id", coursierIds);
          for (const c of cous || []) push(c.user_id, await getDisplayName(svc, c.user_id), "coursier");
        }

        // Admins (toujours autorisés à rejoindre un live).
        const { data: admins } = await svc.from("user_roles").select("user_id").eq("role", "admin");
        for (const a of admins || []) push(a.user_id, await getDisplayName(svc, a.user_id), "admin");

        console.log("livekit-invite: candidats live", { visiteId, count: candidates.length });
        return json({ candidates });
      }


      const targetUserId: string = body.userId;
      if (!targetUserId) return json({ error: "userId requis" }, 400);
      const inviter = await getDisplayName(svc, user.id);

      const { error: notifErr } = await svc.from("notifications").insert({
        user_id: targetUserId,
        type: "call_invite",
        title: "Live de visite en cours",
        message: `${inviter} vous invite à rejoindre le live de la visite`,
        link: visitLiveLink(visiteId),
        metadata: { visiteId, mode: "video", from: user.id, room: `visit:${visiteId}`, live: true },
      });
      if (notifErr) return json({ error: notifErr.message }, 500);
      return json({ success: true });
    }

    // ---------- APPEL 1-À-1 -------------------------------------------------
    if (!conversationId) {
      console.error("livekit-invite: conversationId manquant", { userId: user.id, action });
      return json({ error: "Conversation introuvable (identifiant manquant)" }, 400);
    }

    const allowed = await canAccessConversation(svc, user.id, role, conversationId);
    if (!allowed) {
      console.error("livekit-invite: accès refusé", { userId: user.id, role, conversationId });
      return json({ error: "Accès refusé à cette conversation" }, 403);
    }



    const { data: conv } = await svc
      .from("conversations")
      .select("client_id, agent_id, admin_user_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return json({ error: "Conversation introuvable" }, 404);

    if (action === "candidates") {
      const candidates: { user_id: string; name: string; role: string }[] = [];
      const push = (user_id: string | null, name: string, r: string) => {
        if (!user_id || user_id === user.id) return;
        if (candidates.some((c) => c.user_id === user_id)) return;
        candidates.push({ user_id, name, role: r });
      };

      // Client of the dossier
      if (conv.client_id) {
        const { data: cli } = await svc
          .from("clients")
          .select("user_id, prenom, nom")
          .eq("id", conv.client_id)
          .maybeSingle();
        if (cli?.user_id) push(cli.user_id, `${cli.prenom || ""} ${cli.nom || ""}`.trim() || "Client", "client");
      }

      // Agents linked to the conversation / the client
      const agentIds = new Set<string>();
      if (conv.agent_id) agentIds.add(conv.agent_id);
      const { data: cas } = await svc
        .from("conversation_agents")
        .select("agent_id")
        .eq("conversation_id", conversationId);
      (cas || []).forEach((c: any) => c.agent_id && agentIds.add(c.agent_id));
      if (conv.client_id) {
        const { data: cag } = await svc
          .from("client_agents")
          .select("agent_id")
          .eq("client_id", conv.client_id);
        (cag || []).forEach((c: any) => c.agent_id && agentIds.add(c.agent_id));
      }
      if (agentIds.size) {
        const { data: ags } = await svc.from("agents").select("id, user_id").in("id", [...agentIds]);
        for (const a of ags || []) {
          if (!a.user_id) continue;
          push(a.user_id, await getDisplayName(svc, a.user_id), "agent");
        }
      }

      // Couriers assigned to this client's visits
      if (conv.client_id) {
        const { data: vis } = await svc
          .from("visites")
          .select("coursier_id")
          .eq("client_id", conv.client_id)
          .not("coursier_id", "is", null)
          .limit(50);
        const coursierIds = [...new Set((vis || []).map((v: any) => v.coursier_id))];
        if (coursierIds.length) {
          const { data: cous } = await svc
            .from("coursiers")
            .select("user_id, prenom, nom")
            .in("id", coursierIds);
          (cous || []).forEach((c: any) =>
            push(c.user_id, `${c.prenom || ""} ${c.nom || ""}`.trim() || "Coursier", "coursier"),
          );
        }
      }

      // Admins
      const { data: admins } = await svc.from("user_roles").select("user_id").eq("role", "admin");
      for (const a of admins || []) {
        push(a.user_id, await getDisplayName(svc, a.user_id), "admin");
      }

      return json({ candidates });
    }

    // action === "invite"
    const targetUserId: string = body.userId;
    const mode: string = body.mode || "video";
    if (!targetUserId) return json({ error: "userId requis" }, 400);

    await svc
      .from("call_participants")
      .upsert(
        { conversation_id: conversationId, user_id: targetUserId, invited_by: user.id },
        { onConflict: "conversation_id,user_id" },
      );

    const inviterName = await getDisplayName(svc, user.id);
    const targetRole = await resolveRole(svc, targetUserId);

    await svc.from("notifications").insert({
      user_id: targetUserId,
      type: "call_invite",
      title: mode === "audio" ? "Invitation à un appel audio" : "Invitation à un appel vidéo",
      message: `${inviterName} vous invite à rejoindre l'appel`,
      link: callLink(targetRole, conversationId, mode),
      metadata: { conversationId, mode, from: user.id, room: `call:${conversationId}` },
    });

    return json({ success: true });
  } catch (e) {
    console.error("livekit-invite error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
