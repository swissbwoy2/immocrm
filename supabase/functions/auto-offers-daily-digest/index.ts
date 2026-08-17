import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "admin@immo-rama.ch";
const APP_URL = "https://logisorama.ch";

const MANUAL_KEYWORDS = ["à fixer", "a fixer", "contacter", "à rappeler", "a rappeler", "manuel"];
function needsManual(commentaires: string | null, visits: any[]): boolean {
  const hasVisit = (visits ?? []).some((v: any) => v.date_visite);
  if (hasVisit) {
    const c = (commentaires ?? "").toLowerCase();
    return MANUAL_KEYWORDS.some(k => c.includes(k));
  }
  return true;
}

function fmtDateCH(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-CH", {
      timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Bornes du jour en Europe/Zurich
    const now = new Date();
    const zurichNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
    const startOfDay = new Date(zurichNow); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(zurichNow); endOfDay.setHours(23, 59, 59, 999);
    // Reconvertir en ISO UTC pour requêter
    const offsetMs = zurichNow.getTime() - now.getTime();
    const startISO = new Date(startOfDay.getTime() - offsetMs).toISOString();
    const endISO = new Date(endOfDay.getTime() - offsetMs).toISOString();

    const { data: offresToday } = await supabase
      .from("offres")
      .select("id, created_at, adresse, prix, pieces, commentaires, lien_annonce, client_id, clients(prenom, nom, email), visites(id, date_visite, statut)")
      .eq("envoi_auto", true)
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: false });

    const list = (offresToday ?? []) as any[];
    const totalOffres = list.length;
    const clientsServis = new Set(list.map(o => o.client_id)).size;

    const visitesFixees = list.flatMap((o: any) =>
      (o.visites ?? [])
        .filter((v: any) => v.date_visite)
        .map((v: any) => ({
          date: v.date_visite,
          client: `${o.clients?.prenom ?? ""} ${o.clients?.nom ?? ""}`.trim() || "—",
          adresse: o.adresse ?? "—",
        }))
    );

    const manuel = list.filter(o => needsManual(o.commentaires, o.visites)).map((o: any) => ({
      client: `${o.clients?.prenom ?? ""} ${o.clients?.nom ?? ""}`.trim() || "—",
      email: o.clients?.email ?? "",
      adresse: o.adresse ?? "—",
      info: (o.commentaires ?? "").split("\n").slice(0, 3).join(" • ") || "—",
      lien: o.lien_annonce ?? "",
    }));

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111;">
        <h2 style="color:#1e40af;">Récap Auto-Offres — ${startOfDay.toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })}</h2>
        <p><strong>${totalOffres}</strong> offres automatiques envoyées à <strong>${clientsServis}</strong> client(s).</p>

        <h3 style="margin-top:24px;color:#065f46;">Visites planifiées aujourd'hui (${visitesFixees.length})</h3>
        ${visitesFixees.length === 0 ? '<p style="color:#666;">Aucune visite planifiée.</p>' : `
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:6px;">Date</th><th style="text-align:left;padding:6px;">Client</th><th style="text-align:left;padding:6px;">Adresse</th></tr></thead>
            <tbody>${visitesFixees.map(v => `<tr><td style="padding:6px;border-top:1px solid #eee;">${fmtDateCH(v.date)}</td><td style="padding:6px;border-top:1px solid #eee;">${v.client}</td><td style="padding:6px;border-top:1px solid #eee;">${v.adresse}</td></tr>`).join("")}</tbody>
          </table>
        `}

        <h3 style="margin-top:24px;color:#b91c1c;">À gérer manuellement (${manuel.length})</h3>
        ${manuel.length === 0 ? '<p style="color:#666;">Rien à faire, toutes les visites sont fixées.</p>' : `
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:6px;">Client</th><th style="text-align:left;padding:6px;">Adresse</th><th style="text-align:left;padding:6px;">Info</th></tr></thead>
            <tbody>${manuel.map(m => `<tr><td style="padding:6px;border-top:1px solid #eee;">${m.client}<br><span style="color:#666;font-size:12px;">${m.email}</span></td><td style="padding:6px;border-top:1px solid #eee;">${m.adresse}${m.lien ? ` <a href="${m.lien}">↗</a>` : ""}</td><td style="padding:6px;border-top:1px solid #eee;">${m.info}</td></tr>`).join("")}</tbody>
          </table>
        `}

        <p style="margin-top:32px;"><a href="${APP_URL}/admin/offres-auto" style="background:#1e40af;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Ouvrir /admin/offres-auto</a></p>
      </div>
    `;

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ ok: true, sent: false, totalOffres, visitesFixees: visitesFixees.length, manuel: manuel.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: "Logisorama <support@logisorama.ch>",
      to: [ADMIN_EMAIL],
      subject: `📬 Récap Auto-Offres — ${totalOffres} offres, ${manuel.length} à gérer`,
      html,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, sent: true, id: data?.id, totalOffres, visitesFixees: visitesFixees.length, manuel: manuel.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auto-offers-daily-digest error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
