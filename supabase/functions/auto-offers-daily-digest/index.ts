import { renderCorporateEmail, emailButton, emailParagraph, emailSubheading, emailTable, escapeEmailHtml, emailUrl } from '../_shared/email-shell.ts';
import { formatDateFR, formatDateTimeFR } from '../_shared/date-fr.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "../_shared/tracked-resend.ts";

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
  // Europe/Zurich ; une date sans heure n'affiche jamais « 00:00 »
  return formatDateTimeFR(iso, { weekday: false, fallback: iso });
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

    const e = escapeEmailHtml;
    const muted = (t: string) => `<span style="color:#66736a;font-size:13px;">${t}</span>`;
    const html = renderCorporateEmail({
      title: `Récap Auto-Offres — ${formatDateFR(now)}`,
      preview: `${totalOffres} offres envoyées, ${visitesFixees.length} visite(s) planifiée(s), ${manuel.length} à gérer.`,
      category: "SUIVI ÉQUIPE",
      bodyHtml:
        emailParagraph(`<strong>${totalOffres}</strong> offres automatiques envoyées à <strong>${clientsServis}</strong> client(s).`) +
        emailSubheading(`Visites planifiées aujourd'hui (${visitesFixees.length})`) +
        (visitesFixees.length === 0
          ? emailParagraph("Aucune visite planifiée.", true)
          : emailTable(["Date", "Client", "Adresse"], visitesFixees.map((v) => [e(fmtDateCH(v.date)), e(v.client), e(v.adresse)]))) +
        emailSubheading(`À gérer manuellement (${manuel.length})`) +
        (manuel.length === 0
          ? emailParagraph("Rien à faire, toutes les visites sont fixées.", true)
          : emailTable(["Client", "Adresse", "Info"], manuel.map((m) => [
            `${e(m.client)}${m.email ? `<br>${muted(e(m.email))}` : ""}`,
            `${e(m.adresse)}${m.lien ? ` <a href="${e(emailUrl(m.lien))}" style="color:#205a43;">↗</a>` : ""}`,
            e(m.info),
          ]))) +
        emailButton("Ouvrir /admin/offres-auto", `${APP_URL}/admin/offres-auto`),
    });

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ ok: true, sent: false, totalOffres, visitesFixees: visitesFixees.length, manuel: manuel.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey, "auto-offers-daily-digest");
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
