import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RoomServiceClient } from "https://esm.sh/livekit-server-sdk@2.9.7";
import {
  corsHeaders,
  json,
  serviceClient,
  getAuthUser,
  resolveRole,
  resolveVisitAccess,
  canAccessConversation,
  parseRoom,
  HOST_ROLES,
} from "../_shared/livekit-access.ts";

/**
 * Gestion des participants d'une room LiveKit — RÉSERVÉ AUX HÔTES
 * (admin / agent / coursier rattachés à la visite ou à la conversation).
 *
 * Body : { room, identity, action }
 *  - action = "promote"  → canPublish = true  (faire monter un client)
 *  - action = "demote"   → canPublish = false (redescendre en spectateur)
 *  - action = "mute"     → coupe les pistes audio publiées
 *  - action = "remove"   → retire le participant de la room
 *
 * Un client ne peut JAMAIS appeler cette fonction (403).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL");
    const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
    const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return json({ error: "LiveKit non configuré" }, 500);
    }

    const user = await getAuthUser(req);
    if (!user) return json({ error: "Session expirée : reconnecte-toi." }, 401);

    const { room, identity, action } = await req.json();
    if (!room || !identity || !action) {
      return json({ error: "room, identity et action sont requis" }, 400);
    }
    if (!["promote", "demote", "mute", "remove"].includes(action)) {
      return json({ error: "Action inconnue" }, 400);
    }

    const parsed = parseRoom(room);
    if (!parsed || (parsed.kind !== "visit" && parsed.kind !== "call")) {
      return json({ error: "Salle invalide" }, 400);
    }

    const svc = serviceClient();
    const role = await resolveRole(svc, user.id);
    if (!HOST_ROLES.includes(role)) {
      console.error("livekit-participant-permissions: rôle non autorisé", { userId: user.id, role });
      return json({ error: "Seuls un admin, un agent ou un coursier peuvent gérer les participants" }, 403);
    }

    if (parsed.kind === "visit") {
      const access = await resolveVisitAccess(svc, user.id, role, parsed.id);
      if (!access.allowed || !access.isHost) {
        return json({ error: "Vous n'êtes pas hôte de ce live" }, 403);
      }
    } else {
      const ok = await canAccessConversation(svc, user.id, role, parsed.id);
      if (!ok) return json({ error: "Accès refusé à cette conversation" }, 403);
    }

    // wss:// → https:// pour l'API serveur LiveKit
    const httpUrl = LIVEKIT_URL.replace(/^ws/, "http");
    const rs = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    if (action === "remove") {
      await rs.removeParticipant(room, identity);
      return json({ ok: true, action });
    }

    if (action === "mute") {
      const p = await rs.getParticipant(room, identity);
      const audio = (p.tracks || []).filter((t: any) => t.type === 1 || t.source === 2 || t.type === "AUDIO");
      for (const t of audio) {
        try {
          await rs.mutePublishedTrack(room, identity, t.sid, true);
        } catch (e) {
          console.error("mute track failed", t.sid, e);
        }
      }
      return json({ ok: true, action, muted: audio.length });
    }

    const canPublish = action === "promote";
    await rs.updateParticipant(room, identity, undefined, {
      canSubscribe: true,
      canPublish,
      canPublishData: true,
    });

    return json({ ok: true, action, canPublish });
  } catch (e) {
    console.error("livekit-participant-permissions error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
