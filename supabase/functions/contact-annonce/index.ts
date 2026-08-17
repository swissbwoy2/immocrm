import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RAW_FROM = (Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
const SENDER_EMAIL = RAW_FROM && RAW_FROM.includes("@") ? RAW_FROM : "support@logisorama.ch";

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

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { annonce_id, nom, email, telephone, message } = await req.json();

    if (!annonce_id || !nom || !email || !message) {
      return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), {
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
      .select(
        "id, titre, reference, slug, ville, prix, type_transaction, statut, nb_contacts, email_contact, nom_contact, annonceur_id, annonceurs(nom, prenom, nom_entreprise, email, user_id)",
      )
      .eq("id", annonce_id)
      .maybeSingle();

    if (error || !annonce || annonce.statut !== "publie") {
      return new Response(JSON.stringify({ error: "Annonce introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const annonceur: any = annonce.annonceurs;
    const to = (annonce.email_contact || annonceur?.email || "").trim();
    const url = `https://logisorama.ch/annonces/${annonce.slug || annonce.id}`;

    // If the sender is authenticated, open (or reuse) an in-app conversation
    let conversationId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ") && annonceur?.user_id) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      const senderId = userData?.user?.id;

      if (senderId && senderId !== annonceur.user_id) {
        const { data: existing } = await supabase
          .from("conversations_annonces")
          .select("id")
          .eq("annonce_id", annonce.id)
          .eq("participant_1_id", senderId)
          .eq("participant_2_id", annonceur.user_id)
          .maybeSingle();

        conversationId = existing?.id ?? null;

        if (!conversationId) {
          const { data: created, error: convErr } = await supabase
            .from("conversations_annonces")
            .insert({
              annonce_id: annonce.id,
              participant_1_id: senderId,
              participant_2_id: annonceur.user_id,
            })
            .select("id")
            .single();
          if (convErr) console.error("conversation create error", convErr);
          conversationId = created?.id ?? null;
        }

        if (conversationId) {
          const { error: msgErr } = await supabase.from("messages_annonces").insert({
            conversation_id: conversationId,
            expediteur_id: senderId,
            contenu: message,
          });
          if (msgErr) console.error("message insert error", msgErr);
        }
      }
    }


    if (RESEND_API_KEY && to) {
      const html = `
        <h2>Nouveau message concernant votre annonce</h2>
        <p><strong>${esc(annonce.titre)}</strong>${annonce.reference ? ` — réf. ${esc(annonce.reference)}` : ""}<br/>
        <a href="${url}">${url}</a></p>
        <hr/>
        <p><strong>Nom :</strong> ${esc(nom)}<br/>
        <strong>E-mail :</strong> ${esc(email)}<br/>
        <strong>Téléphone :</strong> ${esc(telephone) || "—"}</p>
        <p style="white-space:pre-wrap;background:#f6f8f7;padding:12px;border-radius:8px">${esc(message)}</p>
        <p style="color:#6b7280;font-size:12px">Message envoyé via le portail d'annonces Logisorama.</p>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `Logisorama <${SENDER_EMAIL}>`,
          to: [to],
          reply_to: email,
          subject: `Nouveau contact pour « ${annonce.titre} »`,
          html,
        }),
      });

      if (!res.ok) {
        console.error("Resend error:", await res.text());
      }
    } else {
      console.warn("contact-annonce: no recipient or missing RESEND_API_KEY");
    }

    await supabase
      .from("annonces_publiques")
      .update({ nb_contacts: (annonce.nb_contacts || 0) + 1 })
      .eq("id", annonce.id);

    return new Response(JSON.stringify({ success: true, conversation_id: conversationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("contact-annonce error", e);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
