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
 * PHASE B — Terminer un live de visite (hôte uniquement).
 * Ferme la room LiveKit et passe la session `lives` en statut "termine".
 * Body : { room | visiteId }
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

    const body = await req.json();
    const room: string = body?.room || (body?.visiteId ? `visit:${body.visiteId}` : "");
    const parsed = parseRoom(room);
    if (!parsed || parsed.kind !== "visit") return json({ error: "Salle de live invalide" }, 400);

    const svc = serviceClient();
    const role = await resolveRole(svc, user.id);
    if (!HOST_ROLES.includes(role)) {
      return json({ error: "Seul un hôte peut terminer le live" }, 403);
    }
    const access = await resolveVisitAccess(svc, user.id, role, parsed.id);
    if (!access.allowed || !access.isHost) {
      return json({ error: "Vous n'êtes pas hôte de ce live" }, 403);
    }

    const httpUrl = LIVEKIT_URL.replace(/^ws/, "http");
    const rs = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    try {
      await rs.deleteRoom(room);
    } catch (e) {
      console.error("deleteRoom failed (room peut-être déjà fermée)", e);
    }

    await svc
      .from("lives")
      .update({ statut: "termine", ended_at: new Date().toISOString() })
      .eq("room_name", room)
      .eq("statut", "en_cours");

    return json({ ok: true });
  } catch (e) {
    console.error("livekit-live-end error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
