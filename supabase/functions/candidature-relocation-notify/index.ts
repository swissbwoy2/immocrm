import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ADMIN_EMAIL = "info@immo-rama.ch";
const fmt = (d?: string | null) => d ? new Intl.DateTimeFormat("fr-CH", {
  timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(d)) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { candidature_id, etape } = await req.json();
    if (typeof candidature_id !== "string" || typeof etape !== "string") return json({ error: "invalid" }, 400);

    const { data: c } = await admin.from("candidatures_location")
      .select("id, user_id, prenom, nom, email, statut, motif_refus, date_signature, date_etat_lieux, date_cles_remises, annonces_publiques(titre, adresse, ville)")
      .eq("id", candidature_id).maybeSingle();
    if (!c) return json({ error: "not_found" }, 404);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const isStaff = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "agent");
    const ap: any = (c as any).annonces_publiques;
    const bien = ap ? [ap.adresse, ap.ville].filter(Boolean).join(", ") || ap.titre : "";

    if (etape === "candidature_deposee") {
      if (c.user_id !== u.user.id || c.statut !== "candidature_deposee") return json({ error: "forbidden" }, 403);
      const r = await sendTemplateEmail("candidature-relocation-etape", ADMIN_EMAIL, {
        templateData: {
          titre: "Nouvelle candidature déposée", intro: `${c.prenom ?? ""} ${c.nom ?? ""} (${c.email ?? ""}) a déposé sa candidature.`,
          bien, ctaLabel: "Voir la candidature", ctaUrl: "https://logisorama.ch/admin/candidatures-relocation",
        },
        idempotencyKey: `cand-reloc-${c.id}-deposee`,
      });
      return json({ sent: r.sent });
    }

    if (!isStaff) return json({ error: "forbidden" }, 403);
    if (!c.email) return json({ sent: false });
    const map: Record<string, { titre: string; intro: string; detail?: string }> = {
      documents_demandes: { titre: "Documents demandés", intro: "Votre candidature avance : merci de téléverser vos justificatifs dans votre espace candidat." },
      refusee: { titre: "Votre candidature n'a pas été retenue", intro: "Nous sommes désolés, votre candidature n'a pas été retenue pour ce logement.", detail: c.motif_refus ?? undefined },
      retenu_bailleur: { titre: "Votre dossier est retenu", intro: "Bonne nouvelle : votre dossier a été retenu. Confirmez dans votre espace que vous souhaitez conclure." },
      bail_signe: { titre: "Bail signé", intro: "La signature de votre bail est enregistrée.", detail: fmt(c.date_signature) },
      date_etat_lieux: { titre: "Date de l'état des lieux fixée", intro: "La date de votre état des lieux d'entrée a été fixée.", detail: fmt(c.date_etat_lieux) },
      etat_lieux_effectue: { titre: "État des lieux effectué", intro: "Votre état des lieux d'entrée est terminé." },
      cles_remises: { titre: "Remise des clés", intro: "Vos clés vous ont été remises. Bienvenue dans votre nouveau logement !", detail: fmt(c.date_cles_remises) },
    };
    const m = map[etape];
    if (!m) return json({ error: "invalid_etape" }, 400);
    const r = await sendTemplateEmail("candidature-relocation-etape", c.email, {
      templateData: { ...m, prenom: c.prenom, bien },
      idempotencyKey: `cand-reloc-${c.id}-${etape}-${Date.now()}`,
    });
    return json({ sent: r.sent });
  } catch (e) {
    console.error("candidature-relocation-notify", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
