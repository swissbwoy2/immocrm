import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXCLUDED = ["desiste", "refuse", "accepte", "retenu_bailleur"];
const fmt = (d?: string | null) => d ? new Intl.DateTimeFormat("fr-CH", {
  timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(d)) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "agent")) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const creneau_id = typeof body?.creneau_id === "string" && UUID.test(body.creneau_id) ? body.creneau_id : null;
    const annonce_id = typeof body?.annonce_id === "string" && UUID.test(body.annonce_id) ? body.annonce_id : null;
    if (!creneau_id && !annonce_id) return json({ error: "creneau_id ou annonce_id requis" }, 400);

    let q = admin.from("candidatures_location")
      .select("id, user_id, prenom, email, statut, creneau_id, date_visite, note_agent, annonces_publiques(titre, adresse, ville), annonce_creneaux(date_heure)")
      .not("statut", "in", `(${EXCLUDED.join(",")})`)
      .limit(1000);
    q = creneau_id ? q.eq("creneau_id", creneau_id) : q.eq("annonce_id", annonce_id).not("creneau_id", "is", null);
    const { data: rows, error } = await q;
    if (error) throw error;

    const stats = { targeted: rows?.length ?? 0, emailed: 0, notified: 0, errors: 0 };
    for (const c of (rows ?? []) as any[]) {
      try {
        const note = `[${new Date().toISOString().slice(0, 10)}] Créneau annulé par l'agence`;
        // Marque d'abord (idempotence : un candidat déjà desiste n'est plus ciblé)
        const { data: upd, error: uErr } = await admin.from("candidatures_location")
          .update({ statut: "desiste", note_agent: c.note_agent ? `${c.note_agent}\n${note}` : note })
          .eq("id", c.id).not("statut", "in", `(${EXCLUDED.join(",")})`).select("id");
        if (uErr) throw uErr;
        if (!upd?.length) continue;

        const ap = c.annonces_publiques;
        const adresse = ap ? [ap.adresse, ap.ville].filter(Boolean).join(", ") : "";
        const titre = ap?.titre ?? "";
        const dateLabel = fmt(c.annonce_creneaux?.date_heure ?? c.date_visite);

        if (c.user_id) {
          const { error: nErr } = await admin.from("notifications").insert({
            user_id: c.user_id, type: "visite_annulee", title: "Visite annulée",
            message: `Votre visite${adresse ? ` au ${adresse}` : ""}${dateLabel ? ` (${dateLabel})` : ""} a été annulée par l'agence.`,
            link: "/candidat",
          });
          if (nErr) console.error("notify-visite-annulee: notif", nErr.message); else stats.notified++;
        }

        if (c.email) {
          try {
            const r: any = await sendTemplateEmail("candidat-visite-annulee", c.email, {
              templateData: { prenom: c.prenom ?? undefined, titre, adresse, dateLabel },
              idempotencyKey: `visite-annulee-${c.creneau_id ?? "x"}-${c.id}`,
            });
            if (r?.sent !== false) stats.emailed++;
          } catch (e) {
            console.error("notify-visite-annulee: email", (e as Error).message);
            stats.errors++;
          }
        }
      } catch (e) {
        console.error("notify-visite-annulee: candidat", c.id, (e as Error).message);
        stats.errors++;
      }
    }
    return json({ ok: true, ...stats });
  } catch (e) {
    console.error("notify-visite-annulee", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
