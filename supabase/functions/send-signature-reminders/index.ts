import { renderCorporateEmail } from '../_shared/email-brand.ts';
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
  date_signature_choisie: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey, "send-signature-reminders") : null;

    const now = new Date();
    console.log(`[${now.toISOString()}] Checking for signature reminders...`);

    // Calculate 24h window
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Fetch candidatures with signature date in the next 24 hours
    const { data: candidatures, error: candidaturesError } = await supabase
      .from("candidatures")
      .select(`
        id,
        client_id,
        offre_id,
        date_signature_choisie,
        lieu_signature,
        offres (adresse, prix, pieces, agent_id),
        clients (user_id, agent_id)
      `)
      .not("date_signature_choisie", "is", null)
      .in("statut", ["signature_planifiee", "bail_recu"])
      .gte("date_signature_choisie", in23Hours.toISOString())
      .lte("date_signature_choisie", in24Hours.toISOString());

    if (candidaturesError) {
      console.error("Error fetching candidatures:", candidaturesError);
      throw candidaturesError;
    }

    console.log(`Found ${candidatures?.length || 0} signatures in 24h window`);

    const remindersToSend: Array<{
      candidature: any;
      recipientEmail: string;
      recipientName: string;
      recipientRole: 'agent' | 'client';
      recipientUserId: string;
    }> = [];

    for (const candidature of (candidatures || [])) {
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
            .eq("reminder_type", "signature_24h_email")
            .maybeSingle();

          if (!existingReminder) {
            remindersToSend.push({
              candidature: { ...candidature, offre, client },
              recipientEmail: clientProfile.email,
              recipientName: `${clientProfile.prenom} ${clientProfile.nom}`,
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
              .eq("reminder_type", "signature_24h_email")
              .maybeSingle();

            if (!existingReminder) {
              remindersToSend.push({
                candidature: { ...candidature, offre, client },
                recipientEmail: agentProfile.email,
                recipientName: `${agentProfile.prenom} ${agentProfile.nom}`,
                recipientRole: 'agent',
                recipientUserId: agentProfile.id,
              });
            }
          }
        }
      }
    }

    console.log(`Sending ${remindersToSend.length} signature reminders`);

    let emailsSent = 0;
    let notificationsSent = 0;

    for (const reminder of remindersToSend) {
      const { candidature, recipientEmail, recipientName, recipientRole, recipientUserId } = reminder;
      const signatureDate = new Date(candidature.date_signature_choisie);

      const formattedDate = signatureDate.toLocaleDateString("fr-CH", { timeZone: 'Europe/Zurich',
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const formattedTime = signatureDate.toLocaleTimeString("fr-CH", { timeZone: 'Europe/Zurich',
        hour: "2-digit",
        minute: "2-digit",
      });

      const adresse = candidature.offre?.adresse || "Adresse non spécifiée";
      const lieuSignature = candidature.lieu_signature || "Chemin de l'Esparcette 5, 1023 Crissier";

      // Send email if Resend is configured
      const emailOptOut = await canSendNotificationEmail(supabase, { userId: recipientUserId, email: recipientEmail });
      if (resend && emailOptOut.allowed) {
        try {
          const emailHtml = renderCorporateEmail({ title: 'Rappel : signature du bail demain', category: "VOTRE LOGEMENT", bodyHtml: `
                  <p style="margin:0 0 18px;">Bonjour ${recipientName},</p>
                  <p style="margin:0 0 18px;">Ceci est un rappel automatique pour la <strong>signature de votre bail</strong> prévue <strong>demain</strong>.</p>

                  <div style="background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:22px;margin:20px 0;">
                    <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
                      <span style="color:#677a6c;font-weight:600;">Date :</span>
                      <span style="color:#202b22;">${formattedDate}</span>
                    </div>
                    <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
                      <span style="color:#677a6c;font-weight:600;">Heure :</span>
                      <span style="color:#202b22;">${formattedTime}</span>
                    </div>
                    <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
                      <span style="color:#677a6c;font-weight:600;">Lieu :</span>
                      <span style="color:#202b22;">${lieuSignature}</span>
                    </div>
                    <div style="padding:8px 0;border-bottom:1px solid #e7ebe5;">
                      <span style="color:#677a6c;font-weight:600;">Bien concerné :</span>
                      <span style="color:#202b22;">${adresse}</span>
                    </div>
                  </div>

                  <h3 style="font-size:18px;line-height:26px;color:#193d2c;margin:22px 0 14px;">Documents à apporter :</h3>
                  <ul>
                    <li style="margin-bottom:8px;">Pièce d'identité valide</li>
                    <li style="margin-bottom:8px;">Attestation d'assurance RC ménage</li>
                    <li style="margin-bottom:8px;">Garantie de loyer (si applicable)</li>
                    <li style="margin-bottom:8px;">Premier loyer + charges</li>
                  </ul>

                  <p style="margin:0 0 18px;">N'hésitez pas à contacter votre agent si vous avez des questions.</p>` });

          const emailResponse = await resend.emails.send({
            from: "ImmoRama <noreply@resend.dev>",
            to: [recipientEmail],
            subject: `✍️ Rappel : Signature du bail demain - ${adresse}`,
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
        p_type: "signature_reminder",
        p_title: "✍️ Rappel : Signature du bail demain",
        p_message: `Signature prévue le ${formattedDate} à ${formattedTime}\n📍 ${lieuSignature}`,
        p_link: recipientRole === 'agent' ? '/agent/candidatures' : '/client/mes-candidatures',
        p_metadata: {
          candidature_id: candidature.id,
          reminder_type: "signature_24h",
        },
      });

      if (!notifError) {
        notificationsSent++;
      }

      // Mark reminder as sent
      await supabase.from("visit_reminders").insert({
        visite_id: candidature.id,
        user_id: recipientUserId,
        reminder_type: "signature_24h_email",
      });

      console.log(`Sent signature reminder to ${recipientEmail} (${recipientRole})`);
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
    console.error("Error in send-signature-reminders:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
