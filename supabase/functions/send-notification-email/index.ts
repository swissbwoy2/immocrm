import { renderNotificationEmail as generateEmailHtml, escapeEmailHtml, emailUrl } from '../_shared/email-brand.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { canSendNotificationEmail } from "../_shared/notificationEmailOptOut.ts";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  // New approach: pass notification_id and fetch from DB
  notification_id?: string;
  // Legacy support: direct values
  user_id?: string;
  notification_type?: string;
  title?: string;
  message?: string;
  link?: string;
  // Broadcast open/click tracking (writes a row into lead_email_logs)
  track?: boolean;
  cta_url?: string;
  campaign_key?: string;
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
    // Candidature status notifications (client)
    candidature_acceptee: '🎉',
    candidature_refusee: '❌',
    candidature_bail_conclu: '📋',
    candidature_attente_bail: '⏳',
    candidature_bail_recu: '📄',
    candidature_signature_planifiee: '📅',
    candidature_signature_effectuee: '✅',
    candidature_etat_lieux_fixe: '🔑',
    candidature_cles_remises: '🏠',
    // Candidature status notifications (admin)
    candidature_acceptee_admin: '✅',
    candidature_refusee_admin: '❌',
    candidature_bail_conclu_admin: '📋',
    candidature_attente_bail_admin: '⏳',
    candidature_bail_recu_admin: '📄',
    candidature_signature_planifiee_admin: '📅',
    candidature_signature_effectuee_admin: '✅',
    candidature_etat_lieux_fixe_admin: '🔑',
    candidature_cles_remises_admin: '🏠',
    // Agent notifications from client actions
    bail_conclu: '🎉',
    date_signature_choisie: '📅',
    // Visit notifications (client)
    visit_confirmed: '✅',
    visit_refused: '❌',
    // Visit notifications (admin)
    visit_confirmed_admin: '✅',
    visit_refused_admin: '❌',
    new_offer_admin: '📬',
    new_visit_admin: '📅',
    coagent_added: '👥',
    coagent_assignment: '👥',
    badge_earned: '🏆',
  };
  return icons[type] || '🔔';
};



// Send push notification to user
async function sendPushNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body,
        link,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Push notification error:", error);
    } else {
      const result = await response.json();
      console.log("Push notification result:", result);
    }
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
}



serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const _deny = await denyIfNotInternal(req, corsHeaders, 'send-notification-email', { allowAnyAuthenticated: true });
  if (_deny) return _deny;

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

    const requestData: NotificationEmailRequest = await req.json();

    let user_id: string;
    let notification_type: string;
    let title: string;
    let message: string;
    let link: string | undefined;
    let notificationId: string | undefined;

    // Check if notification_id is provided - fetch from DB
    if (requestData.notification_id) {
      notificationId = requestData.notification_id;
      console.log(`Fetching notification from DB: ${notificationId}`);

      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notificationId)
        .single();

      if (notifError || !notification) {
        console.error("Notification not found:", notifError);
        return new Response(
          JSON.stringify({ success: false, error: "Notification not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      user_id = notification.user_id;
      notification_type = notification.type;
      title = notification.title;
      message = notification.message;
      link = notification.link;

      console.log(`Notification loaded: user=${user_id}, type=${notification_type}, title=${title}`);
    } else {
      // Legacy support: use direct values
      user_id = requestData.user_id!;
      notification_type = requestData.notification_type!;
      title = requestData.title!;
      message = requestData.message!;
      link = requestData.link;
    }

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

    // Vérifie les préférences email (profiles.notifications_email + désinscriptions)
    const optOut = await canSendNotificationEmail(supabase, {
      userId: user_id,
      email: profile.email,
    });

    if (!optOut.allowed) {
      console.log(`Email notification skipped for ${user_id} (${optOut.reason}) — push still sent`);
      // On coupe UNIQUEMENT l'email : le push reste envoyé.
      try {
        await sendPushNotification(supabaseUrl, supabaseServiceKey, user_id, title, message, link);
      } catch (e) {
        console.error("Push error:", e);
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: `Email skipped: ${optOut.reason}`,
          skipped: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userName = profile.prenom ? `${profile.prenom}` : undefined;
    let emailHtml = generateEmailHtml(title, message, notification_type, link, userName);

    // --- Broadcast open/click tracking (writes into lead_email_logs) ---
    let trackingLogId: string | null = null;
    if (requestData.track) {
      try {
        const { data: logRow, error: logErr } = await supabase
          .from("lead_email_logs")
          .insert({
            lead_id: null,
            campaign_key: requestData.campaign_key ?? "broadcast",
            recipient_email: profile.email,
            subject: title,
            status: "sending",
            sent_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (logErr) {
          console.warn("lead_email_logs insert failed:", logErr.message);
        } else {
          trackingLogId = logRow.id;
          const base = `${supabaseUrl}/functions/v1`;
          const pixel = `<img src="${base}/track-email-open?id=${trackingLogId}" width="1" height="1" style="display:none" alt=""/>`;
          emailHtml = emailHtml.replace("</body>", `${pixel}</body>`);
          if (requestData.cta_url) {
            const tracked = `${base}/track-email-click?id=${trackingLogId}&url=${encodeURIComponent(requestData.cta_url)}`;
            const originalHref = `href="${escapeEmailHtml(emailUrl(requestData.cta_url))}"`;
            emailHtml = emailHtml.split(originalHref).join(`href="${escapeEmailHtml(tracked)}"`);
          }
        }
      } catch (e) {
        console.warn("tracking setup exception:", e);
      }
    }

    // Send push notification in parallel
    const pushPromise = sendPushNotification(supabaseUrl, supabaseServiceKey, user_id, title, message, link);

    // Send email via Resend - use hardcoded value to avoid env variable issues
    const fromEmail = "Logisorama <support@logisorama.ch>";

    console.log(`Sending email from: ${fromEmail} to: ${profile.email}`);

    // Retry logic with exponential backoff for rate limiting
    const maxRetries = 3;
    let lastError: any = null;
    let emailSent = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Add delay for retries (exponential backoff)
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
          console.log(`Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: fromEmail,
          to: [profile.email],
          subject: `${getNotificationIcon(notification_type)} ${title}`,
          html: emailHtml,
        });

        if (emailError) {
          // Check if it's a rate limit error (cast to any for checking properties)
          const errAny = emailError as any;
          if (errAny.statusCode === 429 || errAny.name === 'rate_limit_exceeded') {
            lastError = emailError;
            console.log(`Rate limit hit on attempt ${attempt + 1}, will retry...`);
            continue;
          }
          throw emailError;
        }

        console.log(`Email notification sent successfully to ${profile.email}`, emailData);
        emailSent = true;

        // Persist provider id + mark sent on the tracking row (broadcasts)
        if (trackingLogId) {
          await supabase
            .from("lead_email_logs")
            .update({ status: "sent", provider_message_id: emailData?.id ?? null })
            .eq("id", trackingLogId);
        }

        // Mark notification as email_sent if we have notification_id
        if (notificationId) {
          const { error: updateError } = await supabase
            .from("notifications")
            .update({ email_sent: true })
            .eq("id", notificationId);

          if (updateError) {
            console.warn("Failed to mark notification as email_sent:", updateError);
          } else {
            console.log(`Notification ${notificationId} marked as email_sent`);
          }
        }

        // Wait for push notification to complete
        await pushPromise;

        return new Response(
          JSON.stringify({
            success: true,
            message: "Notification email and push sent",
            email_id: emailData?.id
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        lastError = err;
        if (err.statusCode === 429 || err.name === 'rate_limit_exceeded') {
          console.log(`Rate limit error on attempt ${attempt + 1}`);
          continue;
        }
        throw err;
      }
    }

    // All retries exhausted
    console.error("Max retries reached, email not sent:", lastError);
    throw new Error("Rate limit exceeded after retries");

  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
