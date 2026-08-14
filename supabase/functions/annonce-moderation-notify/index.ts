import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RAW_FROM = (Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
const SENDER_EMAIL = RAW_FROM && RAW_FROM.includes("@") ? RAW_FROM : "support@logisorama.ch";
const SITE_URL = "https://logisorama.ch";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

type Action = "submitted" | "approved" | "refused";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Logisorama <${SENDER_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("Email error", e);
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { annonce_id, action, motif_refus } = (await req.json()) as {
      annonce_id: string;
      action: Action;
      motif_refus?: string;
    };

    if (!annonce_id || !action) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: annonce, error } = await supabase
      .from("annonces_publiques")
      .select("id, titre, ville, slug, motif_refus, annonceur:annonceurs(id, nom, prenom, email, user_id)")
      .eq("id", annonce_id)
      .single();

    if (error || !annonce) {
      return new Response(JSON.stringify({ error: "Annonce introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const annonceur: any = annonce.annonceur;
    const titre = annonce.titre || "Annonce";

    if (action === "submitted") {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const rows = (admins || []).map((a: any) => ({
        user_id: a.user_id,
        type: "annonce_moderation",
        title: "Nouvelle annonce à modérer",
        message: `${titre} — ${annonce.ville || ""} (${annonceur?.prenom || ""} ${annonceur?.nom || ""})`.trim(),
        link: "/admin/annonces-publiques",
        metadata: { annonce_id },
      }));

      if (rows.length) await supabase.from("notifications").insert(rows);

      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", (admins || []).map((a: any) => a.user_id));

      for (const p of adminProfiles || []) {
        if (p.email) {
          await sendEmail(
            p.email,
            `Nouvelle annonce à modérer : ${titre}`,
            `<h2>Nouvelle annonce soumise</h2>
             <p><strong>${esc(titre)}</strong> — ${esc(annonce.ville)}</p>
             <p>Annonceur : ${esc(annonceur?.prenom)} ${esc(annonceur?.nom)} (${esc(annonceur?.email)})</p>
             <p><a href="${SITE_URL}/admin/annonces-publiques">Ouvrir la file de modération</a></p>`,
          );
        }
      }

      return new Response(JSON.stringify({ ok: true, notified: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // approved / refused -> notify the advertiser
    const approved = action === "approved";
    const title = approved ? "Votre annonce est publiée 🎉" : "Votre annonce a été refusée";
    const message = approved
      ? `${titre} est désormais visible sur le portail.`
      : `${titre} a été refusée. Motif : ${motif_refus || annonce.motif_refus || "non précisé"}`;

    if (annonceur?.user_id) {
      await supabase.from("notifications").insert({
        user_id: annonceur.user_id,
        type: approved ? "annonce_publiee" : "annonce_refusee",
        title,
        message,
        link: "/espace-annonceur/mes-annonces",
        metadata: { annonce_id },
      });
    }

    if (annonceur?.email) {
      await sendEmail(
        annonceur.email,
        title,
        approved
          ? `<h2>Votre annonce est en ligne</h2>
             <p><strong>${esc(titre)}</strong> est désormais publiée sur le portail Logisorama.</p>
             <p><a href="${SITE_URL}/annonces/${esc(annonce.slug || annonce.id)}">Voir l'annonce</a></p>`
          : `<h2>Votre annonce a été refusée</h2>
             <p><strong>${esc(titre)}</strong></p>
             <p><strong>Motif :</strong> ${esc(motif_refus || annonce.motif_refus || "non précisé")}</p>
             <p>Vous pouvez la corriger puis la soumettre à nouveau depuis votre espace annonceur.</p>
             <p><a href="${SITE_URL}/espace-annonceur/mes-annonces">Mes annonces</a></p>`,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("annonce-moderation-notify error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erreur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
