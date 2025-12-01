import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getNotificationIcon = (type: string): string => {
  const icons: Record<string, string> = {
    new_client_activated: '✅',
    client_assigned: '👤',
    new_message: '💬',
    new_offer: '🏠',
    new_offer_admin: '📬',
    new_visit: '📅',
    new_visit_admin: '📅',
    visit_reminder: '⏰',
    signature_reminder: '✍️',
    etat_lieux_reminder: '🔑',
    document_uploaded: '📄',
    badge_earned: '🏆',
    candidature_acceptee: '🎉',
    candidature_refusee: '❌',
    candidature_bail_conclu: '📋',
    candidature_attente_bail: '⏳',
    candidature_bail_recu: '📄',
    candidature_signature_planifiee: '📅',
    candidature_signature_effectuee: '✅',
    candidature_etat_lieux_fixe: '🔑',
    candidature_cles_remises: '🏠',
    candidature_acceptee_admin: '✅',
    candidature_refusee_admin: '❌',
    candidature_bail_conclu_admin: '📋',
    candidature_attente_bail_admin: '⏳',
    candidature_bail_recu_admin: '📄',
    candidature_signature_planifiee_admin: '📅',
    candidature_signature_effectuee_admin: '✅',
    candidature_etat_lieux_fixe_admin: '🔑',
    candidature_cles_remises_admin: '🏠',
    bail_conclu: '🎉',
    date_signature_choisie: '📅',
    visit_confirmed: '✅',
    visit_refused: '❌',
    visit_confirmed_admin: '✅',
    visit_refused_admin: '❌',
    activation_request: '🆕',
  };
  return icons[type] || '🔔';
};

const getNotificationColor = (type: string): string => {
  const colors: Record<string, string> = {
    new_client_activated: '#10b981',
    client_assigned: '#3b82f6',
    new_message: '#8b5cf6',
    new_offer: '#f59e0b',
    new_offer_admin: '#f59e0b',
    new_visit: '#06b6d4',
    new_visit_admin: '#06b6d4',
    visit_reminder: '#ef4444',
    signature_reminder: '#ec4899',
    etat_lieux_reminder: '#14b8a6',
    badge_earned: '#f59e0b',
    candidature_acceptee: '#10b981',
    candidature_refusee: '#ef4444',
    candidature_bail_conclu: '#3b82f6',
    candidature_attente_bail: '#f59e0b',
    candidature_bail_recu: '#8b5cf6',
    candidature_signature_planifiee: '#06b6d4',
    candidature_signature_effectuee: '#10b981',
    candidature_etat_lieux_fixe: '#14b8a6',
    candidature_cles_remises: '#10b981',
    candidature_acceptee_admin: '#10b981',
    candidature_refusee_admin: '#ef4444',
    candidature_bail_conclu_admin: '#3b82f6',
    candidature_attente_bail_admin: '#f59e0b',
    candidature_bail_recu_admin: '#8b5cf6',
    candidature_signature_planifiee_admin: '#06b6d4',
    candidature_signature_effectuee_admin: '#10b981',
    candidature_etat_lieux_fixe_admin: '#14b8a6',
    candidature_cles_remises_admin: '#10b981',
    bail_conclu: '#10b981',
    date_signature_choisie: '#3b82f6',
    visit_confirmed: '#10b981',
    visit_refused: '#ef4444',
    visit_confirmed_admin: '#10b981',
    visit_refused_admin: '#ef4444',
    activation_request: '#3b82f6',
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

  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting pending notification emails job...`);

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notifications");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending notifications (not yet emailed, created in last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, message, link, created_at")
      .eq("email_sent", false)
      .gte("created_at", thirtyMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(50); // Process max 50 at a time

    if (fetchError) {
      console.error("Error fetching pending notifications:", fetchError);
      throw fetchError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log("No pending notification emails to send");
      return new Response(
        JSON.stringify({ success: true, message: "No pending emails", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingNotifications.length} pending notification emails`);

    // Get unique user IDs
    const userIds = [...new Set(pendingNotifications.map(n => n.user_id))];
    
    // Fetch all user profiles at once
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, prenom, nom, notifications_email")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Create a map for quick lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const processedIds: string[] = [];

    const fromEmail = "Logisorama <support@logisorama.ch>";

    for (const notification of pendingNotifications) {
      const profile = profileMap.get(notification.user_id);

      if (!profile) {
        console.warn(`Profile not found for user ${notification.user_id}, skipping`);
        processedIds.push(notification.id);
        skippedCount++;
        continue;
      }

      // Check if user has email notifications enabled
      if (profile.notifications_email === false) {
        console.log(`User ${notification.user_id} has email notifications disabled, marking as sent`);
        processedIds.push(notification.id);
        skippedCount++;
        continue;
      }

      try {
        const userName = profile.prenom ? `${profile.prenom}` : undefined;
        const emailHtml = generateEmailHtml(
          notification.title,
          notification.message || '',
          notification.type,
          notification.link,
          userName
        );

        const { error: emailError } = await resend.emails.send({
          from: fromEmail,
          to: [profile.email],
          subject: `${getNotificationIcon(notification.type)} ${notification.title}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          errorCount++;
          // Still mark as processed to avoid spam on errors
          processedIds.push(notification.id);
        } else {
          console.log(`✅ Email sent to ${profile.email} for notification type: ${notification.type}`);
          processedIds.push(notification.id);
          sentCount++;
        }
      } catch (error) {
        console.error(`Exception sending email to ${profile.email}:`, error);
        errorCount++;
        processedIds.push(notification.id);
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update all processed notifications as email_sent = true
    if (processedIds.length > 0) {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ email_sent: true })
        .in("id", processedIds);

      if (updateError) {
        console.error("Error updating notification email_sent status:", updateError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Job completed in ${duration}ms: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedIds.length} notifications`,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-pending-notification-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
