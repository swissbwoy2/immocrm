import { renderCorporateEmail, emailDetails, emailList, emailParagraph, emailSubheading, escapeEmailHtml } from '../_shared/email-shell.ts';
import { formatDateFR, formatTimeFR } from '../_shared/date-fr.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "../_shared/tracked-resend.ts";
import { canSendNotificationEmail } from "../_shared/notificationEmailOptOut.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CandidatureWithDetails {
  id: string;
  client_id: string;
  offre_id: string;
  date_etat_lieux: string;
  heure_etat_lieux: string | null;
  lieu_signature: string | null;
  offres: {
    adresse: string;
    prix: number;
    pieces: number | null;
    agent_id: string | null;
  } | null;
  clients: {
    user_id: string;
    agent_id: string | null;
  } | null;
}

interface ReminderRecord {
  candidature_id: string;
  user_id: string;
  reminder_type: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey, "send-etat-lieux-reminders") : null;

    const now = new Date();
    console.log(`[${now.toISOString()}] Checking for état des lieux reminders...`);

    // Calculate 24h window
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Fetch candidatures with état des lieux in the next 24 hours
    const { data: candidatures, error: candidaturesError } = await supabase
      .from("candidatures")
      .select(`
        id,
        client_id,
        offre_id,
        date_etat_lieux,
        heure_etat_lieux,
        lieu_signature,
        offres (adresse, prix, pieces, agent_id),
        clients (user_id, agent_id)
      `)
      .not("date_etat_lieux", "is", null)
      .eq("statut", "etat_lieux_fixe")
      .gte("date_etat_lieux", in23Hours.toISOString())
      .lte("date_etat_lieux", in24Hours.toISOString());

    if (candidaturesError) {
      console.error("Error fetching candidatures:", candidaturesError);
      throw candidaturesError;
    }

    console.log(`Found ${candidatures?.length || 0} états des lieux in 24h window`);

    const remindersToSend: Array<{
      candidature: any;
      recipientEmail: string;
      recipientName: string;
      recipientRole: 'agent' | 'client';
      recipientUserId: string;
    }> = [];

    // Track sent reminders to avoid duplicates
    const sentReminders = new Set<string>();

    for (const candidature of (candidatures || [])) {
      const etatLieuxDate = new Date(candidature.date_etat_lieux);
      const offre = Array.isArray(candidature.offres) ? candidature.offres[0] : candidature.offres;
      const client = Array.isArray(candidature.clients) ? candidature.clients[0] : candidature.clients;

      // Get client info
      if (client?.user_id) {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("id, prenom, nom, email")
          .eq("id", client.user_id)
          .single();

        if (clientProfile?.email) {
          // Check if reminder already sent
          const { data: existingReminder } = await supabase
            .from("visit_reminders")
            .select("id")
            .eq("visite_id", candidature.id)
            .eq("user_id", clientProfile.id)
            .eq("reminder_type", "etat_lieux_24h_email")
            .maybeSingle();

          if (!existingReminder) {
            remindersToSend.push({
              candidature: { ...candidature, offre, client },
              recipientEmail: clientProfile.email,
              recipientName: `${clientProfile.prenom ?? ""} ${clientProfile.nom ?? ""}`.trim(),
              recipientRole: 'client',
              recipientUserId: clientProfile.id,
            });
          }
        }
      }

      // Get agent info
      const agentId = client?.agent_id || offre?.agent_id;
      if (agentId) {
        const { data: agent } = await supabase
          .from("agents")
          .select("user_id")
          .eq("id", agentId)
          .single();

        if (agent?.user_id) {
          const { data: agentProfile } = await supabase
            .from("profiles")
            .select("id, prenom, nom, email")
            .eq("id", agent.user_id)
            .single();

          if (agentProfile?.email) {
            // Check if reminder already sent
            const { data: existingReminder } = await supabase
              .from("visit_reminders")
              .select("id")
              .eq("visite_id", candidature.id)
              .eq("user_id", agentProfile.id)
              .eq("reminder_type", "etat_lieux_24h_email")
              .maybeSingle();

            if (!existingReminder) {
              remindersToSend.push({
                candidature: { ...candidature, offre, client },
                recipientEmail: agentProfile.email,
                recipientName: `${agentProfile.prenom ?? ""} ${agentProfile.nom ?? ""}`.trim(),
                recipientRole: 'agent',
                recipientUserId: agentProfile.id,
              });
            }
          }
        }
      }
    }

    console.log(`Sending ${remindersToSend.length} email reminders`);

    let emailsSent = 0;
    let notificationsSent = 0;

    for (const reminder of remindersToSend) {
      const { candidature, recipientEmail, recipientName, recipientRole, recipientUserId } = reminder;
      // date_etat_lieux = jour choisi (stocké à minuit UTC) ; l'heure est dans
      // heure_etat_lieux. Affichage en Europe/Zurich, jamais d'heure fictive.
      const formattedDate = formatDateFR(candidature.date_etat_lieux, { weekday: true });
      const heureText = formatTimeFR(candidature.heure_etat_lieux) ||
        formatTimeFR(candidature.date_etat_lieux) || "";

      const adresse = candidature.offre?.adresse || "Adresse non spécifiée";
      const lieuSignature = candidature.lieu_signature || "Chemin de l'Esparcette 5, 1023 Crissier";

      // Send email if Resend is configured
      const emailOptOut = await canSendNotificationEmail(supabase, { userId: recipientUserId, email: recipientEmail });
      if (resend && emailOptOut.allowed) {
        try {
          const emailHtml = renderCorporateEmail({
            title: 'Rappel : état des lieux demain',
            preview: `État des lieux et remise des clés ${formattedDate}${heureText ? ` à ${heureText}` : ""}.`,
            category: "VOTRE LOGEMENT",
            bodyHtml:
              emailParagraph(recipientName.trim() ? `Bonjour ${escapeEmailHtml(recipientName.trim())},` : "Bonjour,") +
              emailParagraph("Ceci est un rappel automatique pour votre <strong>état des lieux et remise des clés</strong> prévu <strong>demain</strong>.") +
              emailDetails([
                ["Date", formattedDate],
                ["Heure", heureText || "À confirmer avec votre agent"],
                ["Bien", adresse],
              ]) +
              emailSubheading("Documents à apporter") +
              emailList([
                "Pièce d'identité valide",
                "Attestation d'assurance RC ménage",
                "Premier loyer (si pas encore réglé)",
              ]) +
              emailParagraph("N'hésitez pas à contacter votre agent si vous avez des questions."),
          });

          const emailResponse = await resend.emails.send({
            from: "ImmoRama <noreply@resend.dev>",
            to: [recipientEmail],
            subject: `🔑 Rappel : État des lieux demain - ${adresse}`,
            html: emailHtml,
          });

          console.log(`Email sent to ${recipientEmail}:`, emailResponse);
          emailsSent++;
        } catch (emailError) {
          console.error(`Error sending email to ${recipientEmail}:`, emailError);
        }
      }

      // Also create in-app notification
      const { error: notifError } = await supabase.rpc("create_notification", {
        p_user_id: recipientUserId,
        p_type: "etat_lieux_reminder",
        p_title: "🔑 Rappel : État des lieux demain",
        p_message: `État des lieux prévu le ${formattedDate}${heureText ? ` à ${heureText}` : ""}\n📍 ${adresse}`,
        p_link: recipientRole === 'agent' ? '/agent/candidatures' : '/client/mes-candidatures',
        p_metadata: {
          candidature_id: candidature.id,
          reminder_type: "etat_lieux_24h",
        },
      });

      if (!notifError) {
        notificationsSent++;
      }

      // Mark reminder as sent
      await supabase.from("visit_reminders").insert({
        visite_id: candidature.id,
        user_id: recipientUserId,
        reminder_type: "etat_lieux_24h_email",
      });

      console.log(`Sent état des lieux reminder to ${recipientEmail} (${recipientRole})`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emails_sent: emailsSent,
        notifications_sent: notificationsSent,
        candidatures_checked: candidatures?.length || 0,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-etat-lieux-reminders:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
