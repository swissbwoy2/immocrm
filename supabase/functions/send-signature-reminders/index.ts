import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
      
      const formattedDate = signatureDate.toLocaleDateString("fr-CH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      
      const formattedTime = signatureDate.toLocaleTimeString("fr-CH", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const adresse = candidature.offre?.adresse || "Adresse non spécifiée";
      const lieuSignature = candidature.lieu_signature || "Chemin de l'Esparcette 5, 1023 Crissier";

      // Send email if Resend is configured
      if (resend) {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
                .info-row { margin: 10px 0; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; }
                .cta { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✍️ Rappel : Signature du bail demain</h1>
                </div>
                <div class="content">
                  <p>Bonjour ${recipientName},</p>
                  <p>Ceci est un rappel automatique pour la <strong>signature de votre bail</strong> prévue <strong>demain</strong>.</p>
                  
                  <div class="highlight">
                    <div class="info-row">
                      <span class="label">📅 Date :</span>
                      <span class="value">${formattedDate}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">⏰ Heure :</span>
                      <span class="value">${formattedTime}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">📍 Lieu :</span>
                      <span class="value">${lieuSignature}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">🏠 Bien concerné :</span>
                      <span class="value">${adresse}</span>
                    </div>
                  </div>
                  
                  <h3>📋 Documents à apporter :</h3>
                  <ul>
                    <li>Pièce d'identité valide</li>
                    <li>Attestation d'assurance RC ménage</li>
                    <li>Garantie de loyer (si applicable)</li>
                    <li>Premier loyer + charges</li>
                  </ul>
                  
                  <p>N'hésitez pas à contacter votre agent si vous avez des questions.</p>
                  
                  <div class="footer">
                    <p>ImmoRama - Votre partenaire immobilier</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
