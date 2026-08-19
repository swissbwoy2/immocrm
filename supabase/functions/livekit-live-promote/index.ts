import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RoomServiceClient } from "https://esm.sh/livekit-server-sdk@2.9.7";
import {
  corsHeaders,
  json,
  serviceClient,
  getAuthUser,
  resolveRole,
  resolveVisitAccess,
  parseRoom,
  HOST_ROLES,
} from "../_shared/livekit-access.ts";

/**
 * PHASE B — Promotion / rétrogradation d'un participant d'un LIVE de visite.
 * RÉSERVÉ AUX HÔTES (admin / agent / coursier rattachés à la visite).
 *
 * Body : { room | visiteId, identity, action: "promote" | "demote" }
 * Règle : 2 intervenants promus maximum simultanément (hors hôtes).
 */
const MAX_SPEAKERS = 2;

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

    const body = await req.json();
    const identity: string = body?.identity;
    const action: string = body?.action;
    const room: string = body?.room || (body?.visiteId ? `visit:${body.visiteId}` : "");

    if (!room || !identity || !["promote", "demote"].includes(action)) {
      return json({ error: "room/visiteId, identity et action (promote|demote) sont requis" }, 400);
    }

    const parsed = parseRoom(room);
    if (!parsed || parsed.kind !== "visit") return json({ error: "Salle de live invalide" }, 400);

    const svc = serviceClient();
    const role = await resolveRole(svc, user.id);
    if (!HOST_ROLES.includes(role)) {
      console.error("livekit-live-promote: rôle non autorisé", { userId: user.id, role });
      return json({ error: "Seul un admin, un agent ou un coursier peut gérer les intervenants" }, 403);
    }

    const access = await resolveVisitAccess(svc, user.id, role, parsed.id);
    if (!access.allowed || !access.isHost) {
      return json({ error: "Vous n'êtes pas hôte de ce live" }, 403);
    }

    const httpUrl = LIVEKIT_URL.replace(/^ws/, "http");
    const rs = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    if (action === "promote") {
      // Compte des intervenants actuellement promus (hors hôtes).
      const participants = await rs.listParticipants(room);
      const speakers = participants.filter((p: any) => {
        if (p.identity === identity) return false;
        let meta: any = {};
        try {
          meta = p.metadata ? JSON.parse(p.metadata) : {};
        } catch {
          meta = {};
        }
        if (meta?.host) return false;
        return !!p.permission?.canPublish;
      });
      if (speakers.length >= MAX_SPEAKERS) {
        return json(
          {
            error: `Maximum ${MAX_SPEAKERS} intervenants en direct : redescendez quelqu'un d'abord.`,
          },
          409,
        );
      }
    }

    const canPublish = action === "promote";
    await rs.updateParticipant(room, identity, undefined, {
      canSubscribe: true,
      canPublish,
      canPublishData: true,
    });

    return json({ ok: true, action, canPublish });
  } catch (e) {
    console.error("livekit-live-promote error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
