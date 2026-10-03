import { renderNotificationEmail as generateEmailHtml } from '../_shared/email-brand.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "../_shared/tracked-resend.ts";
import { canSendNotificationEmail } from "../_shared/notificationEmailOptOut.ts";

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

    const resend = new Resend(resendApiKey, "send-pending-notification-emails");

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

      // Vérifie les préférences email (profil + désinscriptions)
      const optOut = await canSendNotificationEmail(supabase, {
        userId: notification.user_id,
        email: profile.email,
      });
      if (!optOut.allowed) {
        console.log(`Email skipped for ${notification.user_id} (${optOut.reason})`);
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
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
