// Cron quotidien: détecte les visites effectuées sans compte-rendu envoyé
// depuis > 48h et crée une notification admin (idempotent via compte_rendu_alerts).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Visites effectuées entre 48h et 30j sans compte-rendu envoyé
  const { data: visites } = await supabase
    .from("visites")
    .select("id, agent_id, client_id, date_visite, offre_id")
    .eq("statut", "effectuee")
    .lte("date_visite", cutoff)
    .gte("date_visite", since)
    .limit(500);

  const ids = (visites || []).map((v: any) => v.id);
  if (!ids.length) {
    return new Response(JSON.stringify({ ok: true, retard: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: crs } = await supabase
    .from("visite_comptes_rendus")
    .select("visite_id, envoye_au_client_at")
    .in("visite_id", ids)
    .not("envoye_au_client_at", "is", null);

  const sentSet = new Set((crs || []).map((c: any) => c.visite_id));
  const enRetard = (visites || []).filter((v: any) => !sentSet.has(v.id));

  // Filtrer celles déjà alertées
  const { data: alreadyAlerted } = await supabase
    .from("compte_rendu_alerts")
    .select("visite_id")
    .in("visite_id", enRetard.map((v: any) => v.id))
    .eq("alert_type", "admin_daily");
  const alertedSet = new Set((alreadyAlerted || []).map((a: any) => a.visite_id));
  const toAlert = enRetard.filter((v: any) => !alertedSet.has(v.id));

  if (!toAlert.length) {
    return new Response(JSON.stringify({ ok: true, retard: enRetard.length, nouvelles_alertes: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Récupérer admins
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const adminUserIds = (adminRoles || []).map((r: any) => r.user_id);

  // Créer notification interne pour chaque admin (groupée)
  const summary = `${toAlert.length} compte(s)-rendu(s) en retard (>48h) détecté(s)`;
  const notifs = adminUserIds.map((uid: string) => ({
    user_id: uid,
    type: "compte_rendu_retard",
    title: "⚠️ Comptes-rendus en retard",
    message: summary,
    link: "/admin/comptes-rendus",
    read: false,
  }));
  if (notifs.length) {
    await supabase.from("notifications").insert(notifs);
  }

  // Marquer comme alertées
  const alertRows = toAlert.map((v: any) => ({
    visite_id: v.id,
    agent_id: v.agent_id,
    hours_late: Math.floor((Date.now() - new Date(v.date_visite).getTime()) / 3600000),
    alert_type: "admin_daily",
  }));
  await supabase.from("compte_rendu_alerts").insert(alertRows);

  return new Response(JSON.stringify({
    ok: true,
    retard: enRetard.length,
    nouvelles_alertes: toAlert.length,
    admins_notifies: adminUserIds.length,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
