// Rappels de visite — STRICTEMENT IDEMPOTENT
// Un seul rappel par visite (24h avant), jamais recréé.
// Marqueur: visites.reminder_24h_sent / reminder_24h_sent_at
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Visite {
  id: string;
  date_visite: string;
  adresse: string;
  agent_id: string | null;
  client_id: string | null;
  coursier_id?: string | null;
  statut_coursier?: string | null;
  offre_id?: string | null;
  est_deleguee: boolean;
  notes: string | null;
}

function formatWhen(date: Date) {
  const d = date.toLocaleDateString("fr-CH", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Zurich",
  });
  const t = date.toLocaleTimeString("fr-CH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich",
  });
  return { d, t };
}

function linkFor(role: "agent" | "client" | "admin" | "coursier"): string {
  switch (role) {
    case "agent": return "/agent/visites";
    case "client": return "/client/visites";
    case "admin": return "/admin/calendrier";
    case "coursier": return "/coursier/missions";
    default: return "/";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    // Fenêtre large (jusqu'à 26h) : l'idempotence est garantie par reminder_24h_sent,
    // donc aucun risque de doublon même si le cron passe plusieurs fois.
    const lower = new Date(now.getTime() + 20 * 3600 * 1000).toISOString();
    const upper = new Date(now.getTime() + 26 * 3600 * 1000).toISOString();

    const { data: visitesRaw, error } = await supabase
      .from("visites")
      .select("id, date_visite, adresse, agent_id, client_id, coursier_id, statut_coursier, offre_id, est_deleguee, notes, reminder_24h_sent")
      .in("statut", ["planifiee", "confirmee"])
      .gte("date_visite", lower)
      .lte("date_visite", upper)
      .or("reminder_24h_sent.is.null,reminder_24h_sent.eq.false")
      .limit(200);

    if (error) throw error;

    const visites = (visitesRaw || []) as unknown as Visite[];
    console.log(`[visit-reminders] ${visites.length} visite(s) éligibles`);

    if (visites.length === 0) {
      return new Response(JSON.stringify({ success: true, reminders_sent: 0, visits: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentIds = [...new Set(visites.map((v) => v.agent_id).filter(Boolean))] as string[];
    const clientIds = [...new Set(visites.map((v) => v.client_id).filter(Boolean))] as string[];
    const coursierIds = [...new Set(visites.map((v) => v.coursier_id).filter(Boolean))] as string[];

    const [agentsRes, clientsRes, adminsRes, coursiersRes] = await Promise.all([
      agentIds.length ? supabase.from("agents").select("id, user_id").in("id", agentIds) : Promise.resolve({ data: [] as any[] }),
      clientIds.length ? supabase.from("clients").select("id, user_id").in("id", clientIds) : Promise.resolve({ data: [] as any[] }),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      coursierIds.length ? supabase.from("coursiers").select("id, user_id").in("id", coursierIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const agentMap = new Map((agentsRes.data || []).map((a: any) => [a.id, a.user_id]));
    const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c.user_id]));
    const coursierMap = new Map((coursiersRes.data || []).map((c: any) => [c.id, c.user_id]));
    const adminUserIds = (adminsRes.data || []).map((a: any) => a.user_id);

    let sent = 0;

    for (const visite of visites) {
      const visiteDate = new Date(visite.date_visite);
      const { d, t } = formatWhen(visiteDate);
      const suffix = visite.est_deleguee ? " (Visite déléguée)" : "";
      const body = `${visite.adresse}\n${d} à ${t}${suffix}`;

      // Destinataires : UNE seule notification par personne, par visite.
      const recipients: Array<{ userId: string; role: "agent" | "client" | "admin" | "coursier" }> = [];

      const agentUserId = visite.agent_id ? agentMap.get(visite.agent_id) : null;
      if (agentUserId) recipients.push({ userId: agentUserId, role: "agent" });

      const clientUserId = visite.client_id ? clientMap.get(visite.client_id) : null;
      if (clientUserId) recipients.push({ userId: clientUserId, role: "client" });

      if (visite.statut_coursier === "accepte" && visite.coursier_id) {
        const cu = coursierMap.get(visite.coursier_id);
        if (cu) recipients.push({ userId: cu, role: "coursier" });
      }

      // Admins : UNE notification groupée par visite (jamais une par client concerné)
      for (const adminUserId of adminUserIds) {
        if (recipients.some((r) => r.userId === adminUserId)) continue;
        recipients.push({ userId: adminUserId, role: "admin" });
      }

      for (const r of recipients) {
        const { error: notifError } = await supabase.rpc("create_notification", {
          p_user_id: r.userId,
          p_type: "visit_reminder",
          p_title: "📅 Rappel visite demain",
          p_message: body,
          p_link: linkFor(r.role),
          p_metadata: { visite_id: visite.id, reminder_type: "day_before" },
        });
        if (notifError) {
          console.error(`[visit-reminders] notif error ${r.userId}`, notifError);
          continue;
        }
        sent++;
      }

      // Trace historique (best-effort)
      try {
        await supabase.from("visit_reminders").upsert(
          recipients.map((r) => ({ visite_id: visite.id, user_id: r.userId, reminder_type: "day_before" })),
          { onConflict: "visite_id,user_id,reminder_type", ignoreDuplicates: true },
        );
      } catch (e) {
        console.warn("[visit-reminders] visit_reminders upsert failed", e);
      }

      // WhatsApp 24h — client uniquement
      if (visite.client_id && clientUserId) {
        try {
          const { data: prof } = await supabase
            .from("profiles").select("prenom").eq("id", clientUserId).maybeSingle();

          let offre: any = null;
          if (visite.offre_id) {
            const { data: o } = await supabase
              .from("offres")
              .select("pieces, surface, adresse, prix, etage, lien_annonce")
              .eq("id", visite.offre_id)
              .maybeSingle();
            offre = o;
          }

          let agentName = "votre agent";
          if (agentUserId) {
            const { data: ap } = await supabase
              .from("profiles").select("prenom, nom").eq("id", agentUserId).maybeSingle();
            const full = `${ap?.prenom || ""} ${ap?.nom || ""}`.trim();
            if (full) agentName = full;
          }

          const fmtPrix = (n: any) =>
            n == null ? "—" : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");

          await supabase.functions.invoke("send-whatsapp-notification", {
            body: {
              event_type: "visit_reminder_24h",
              template_key: "visit_reminder_24h",
              client_id: visite.client_id,
              preference_key: "visit_reminders_enabled",
              variables: [
                prof?.prenom || "Client",
                t,
                String(offre?.pieces ?? "—"),
                String(offre?.surface ?? "—"),
                offre?.adresse || visite.adresse || "—",
                fmtPrix(offre?.prix),
                offre?.etage || "—",
                offre?.lien_annonce && String(offre.lien_annonce).trim() !== ""
                  ? offre.lien_annonce : "Sur demande",
                agentName,
              ],
            },
          });
        } catch (e) {
          console.warn("[visit-reminders] WA non-blocking failure", e);
        }
      }

      // Marqueur d'idempotence : ce rappel ne sera JAMAIS recréé.
      await supabase
        .from("visites")
        .update({ reminder_24h_sent: true, reminder_24h_sent_at: new Date().toISOString() })
        .eq("id", visite.id);
    }

    return new Response(
      JSON.stringify({ success: true, visits: visites.length, reminders_sent: sent, timestamp: now.toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in send-visit-reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
