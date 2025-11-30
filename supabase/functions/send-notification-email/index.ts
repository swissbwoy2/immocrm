import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  link?: string;
}

const getNotificationIcon = (type: string): string => {
  const icons: Record<string, string> = {
    new_client_activated: '✅',
    client_assigned: '👤',
    new_message: '💬',
    new_offer: '🏠',
    new_visit: '📅',
    visit_reminder: '⏰',
    signature_reminder: '✍️',
    etat_lieux_reminder: '🔑',
    document_uploaded: '📄',
    candidature_update: '📋',
    // Candidature status notifications
    candidature_acceptee: '🎉',
    candidature_refusee: '❌',
    candidature_bail_conclu: '📋',
    candidature_attente_bail: '⏳',
    candidature_bail_recu: '📄',
    candidature_signature_planifiee: '📅',
    candidature_signature_effectuee: '✅',
    candidature_etat_lieux_fixe: '🔑',
    candidature_cles_remises: '🏠',
    // Agent notifications from client actions
    bail_conclu: '🎉',
    date_signature_choisie: '📅',
    // Visit notifications
    visit_confirmed: '✅',
    visit_refused: '❌',
  };
  return icons[type] || '🔔';
};

const getNotificationColor = (type: string): string => {
  const colors: Record<string, string> = {
    new_client_activated: '#10b981',
    client_assigned: '#3b82f6',
    new_message: '#8b5cf6',
    new_offer: '#f59e0b',
    new_visit: '#06b6d4',
    visit_reminder: '#ef4444',
    signature_reminder: '#ec4899',
    etat_lieux_reminder: '#14b8a6',
    // Candidature status colors
    candidature_acceptee: '#10b981',
    candidature_refusee: '#ef4444',
    candidature_bail_conclu: '#3b82f6',
    candidature_attente_bail: '#f59e0b',
    candidature_bail_recu: '#8b5cf6',
    candidature_signature_planifiee: '#06b6d4',
    candidature_signature_effectuee: '#10b981',
    candidature_etat_lieux_fixe: '#14b8a6',
    candidature_cles_remises: '#10b981',
    // Agent notifications
    bail_conclu: '#10b981',
    date_signature_choisie: '#3b82f6',
    // Visit notifications
    visit_confirmed: '#10b981',
    visit_refused: '#ef4444',
  };
  return colors[type] || '#6366f1';
};

const generateEmailHtml = (
  title: string,
  message: string,
  type: string,
  link?: string,
  userName?: string
): string => {
  const icon = getNotificationIcon(type);
  const color = getNotificationColor(type);
  const baseUrl = 'https://logisorama.ch';
  const fullLink = link ? `${baseUrl}${link}` : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); padding: 32px 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${title}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${userName ? `<p style="margin: 0 0 20px; color: #6b7280; font-size: 16px;">Bonjour ${userName},</p>` : ''}
              
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">${message}</p>
              </div>
              
              ${fullLink ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${fullLink}" style="display: inline-block; background-color: ${color}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Voir les détails
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                Cet email est une notification automatique de Logisorama
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Logisorama - Tous droits réservés
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notification");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, notification_type, title, message, link }: NotificationEmailRequest = await req.json();

    if (!user_id || !title || !message) {
      throw new Error("user_id, title, and message are required");
    }

    console.log(`Sending notification email for user ${user_id}, type: ${notification_type}`);

    // Get user profile to get email and notification preference
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, prenom, nom, notifications_email")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found for user:", user_id);
      throw new Error("User profile not found");
    }

    // Check if user has email notifications enabled
    if (profile.notifications_email === false) {
      console.log(`User ${user_id} has email notifications disabled, skipping`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email notifications disabled for this user",
          skipped: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userName = profile.prenom ? `${profile.prenom}` : undefined;
    const emailHtml = generateEmailHtml(title, message, notification_type, link, userName);

    // Send email via Resend - use hardcoded value to avoid env variable issues
    const fromEmail = "Logisorama <support@logisorama.ch>";
    
    console.log(`Sending email from: ${fromEmail} to: ${profile.email}`);
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [profile.email],
      subject: `${getNotificationIcon(notification_type)} ${title}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log(`Email notification sent successfully to ${profile.email}`, emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification email sent",
        email_id: emailData?.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
