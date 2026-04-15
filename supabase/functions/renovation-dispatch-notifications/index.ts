import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const db = createClient(supabaseUrl, serviceKey);

    const { data: roles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const userRoles = (roles || []).map((r: { role: string }) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("agent")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check email toggle on project
    const { data: projectData } = await db
      .from("renovation_projects")
      .select("immeuble_id, created_by, email_notifications_enabled")
      .eq("id", projectId)
      .single();

    const emailEnabled = projectData?.email_notifications_enabled !== false;

    // Load active alerts
    const { data: alerts } = await db
      .from("renovation_ai_alerts")
      .select("id, title, message, severity, alert_type")
      .eq("project_id", projectId)
      .eq("is_resolved", false);

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ dispatched: 0, skipped: 0, emails_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve recipients
    const recipientUserIds = new Set<string>();

    // 1. All admins
    const { data: adminRoles } = await db
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    for (const ar of adminRoles || []) {
      recipientUserIds.add(ar.user_id);
    }

    // 2. Agent via immeuble
    if (projectData) {
      const { data: immeuble } = await db
        .from("immeubles")
        .select("agent_responsable_id, proprietaire_id")
        .eq("id", projectData.immeuble_id)
        .single();

      let agentUserId: string | null = null;

      if (immeuble?.agent_responsable_id) {
        const { data: agent } = await db
          .from("agents")
          .select("user_id")
          .eq("id", immeuble.agent_responsable_id)
          .single();
        agentUserId = agent?.user_id || null;
      }

      if (agentUserId) {
        recipientUserIds.add(agentUserId);
      } else if (projectData.created_by) {
        recipientUserIds.add(projectData.created_by);
      }

      // 3. Proprietaire
      if (immeuble?.proprietaire_id) {
        const { data: prop } = await db
          .from("proprietaires")
          .select("user_id")
          .eq("id", immeuble.proprietaire_id)
          .single();
        if (prop?.user_id) {
          recipientUserIds.add(prop.user_id);
        }
      }
    }

    // Dispatch notifications
    let dispatched = 0;
    let skipped = 0;
    let emailsSent = 0;

    // Alerts that qualify for email: critical and warning severity
    const emailAlertTypes = new Set(["critical", "warning"]);

    for (const alert of alerts) {
      for (const recipientId of recipientUserIds) {
        // In-app notification
        const idempotencyKey = `${alert.id}:${recipientId}`;
        const { error } = await db
          .from("renovation_notifications_queue")
          .upsert(
            {
              project_id: projectId,
              recipient_user_id: recipientId,
              channel: "in_app",
              title: alert.title,
              body: alert.message,
              data: { alert_type: alert.alert_type, severity: alert.severity },
              status: "pending",
              alert_id: alert.id,
              idempotency_key: idempotencyKey,
            },
            { onConflict: "idempotency_key", ignoreDuplicates: true }
          );

        if (error) {
          skipped++;
        } else {
          dispatched++;
        }

        // Email notification for critical/warning alerts
        if (emailEnabled && emailAlertTypes.has(alert.severity)) {
          const emailKey = `${alert.id}:${recipientId}:email`;
          
          // Check idempotency: don't send email if already queued
          const { data: existingEmail } = await db
            .from("renovation_notifications_queue")
            .select("id")
            .eq("idempotency_key", emailKey)
            .maybeSingle();

          if (!existingEmail) {
            // Upsert email notification record
            const { error: emailQueueError } = await db
              .from("renovation_notifications_queue")
              .upsert(
                {
                  project_id: projectId,
                  recipient_user_id: recipientId,
                  channel: "email",
                  title: alert.title,
                  body: alert.message,
                  data: { alert_type: alert.alert_type, severity: alert.severity },
                  status: "pending",
                  alert_id: alert.id,
                  idempotency_key: emailKey,
                },
                { onConflict: "idempotency_key", ignoreDuplicates: true }
              );

            if (!emailQueueError) {
              // Send email via existing send-notification-email
              try {
                const emailResponse = await fetch(
                  `${supabaseUrl}/functions/v1/send-notification-email`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                      user_id: recipientId,
                      notification_type: `renovation_${alert.alert_type}`,
                      title: `🔧 ${alert.title}`,
                      message: alert.message,
                      link: `/renovation`,
                    }),
                  }
                );

                if (emailResponse.ok) {
                  emailsSent++;
                  // Mark as sent
                  await db
                    .from("renovation_notifications_queue")
                    .update({ status: "sent" })
                    .eq("idempotency_key", emailKey);
                } else {
                  const errBody = await emailResponse.text();
                  console.error(JSON.stringify({ event: "renovation_error", function: "renovation-dispatch-notifications", project_id: projectId, error: `Email send failed: ${emailResponse.status}`, context: { alert_id: alert.id, recipient: recipientId, response: errBody.substring(0, 300) } }));
                }
              } catch (emailErr) {
                console.error(JSON.stringify({ event: "renovation_error", function: "renovation-dispatch-notifications", project_id: projectId, error: `Email exception: ${(emailErr as Error).message}`, context: { alert_id: alert.id, recipient: recipientId } }));
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ dispatched, skipped, emails_sent: emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(JSON.stringify({ event: "renovation_error", function: "renovation-dispatch-notifications", error: (err as Error).message }));
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
