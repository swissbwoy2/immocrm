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

    // Load active alerts
    const { data: alerts } = await db
      .from("renovation_ai_alerts")
      .select("id, title, message, severity, alert_type")
      .eq("project_id", projectId)
      .eq("is_resolved", false);

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ dispatched: 0, skipped: 0 }),
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

    // 2. Agent: immeubles.agent_responsable_id → agents.user_id, fallback created_by
    const { data: project } = await db
      .from("renovation_projects")
      .select("immeuble_id, created_by")
      .eq("id", projectId)
      .single();

    if (project) {
      const { data: immeuble } = await db
        .from("immeubles")
        .select("agent_responsable_id, proprietaire_id")
        .eq("id", project.immeuble_id)
        .single();

      let agentUserId: string | null = null;

      if (immeuble?.agent_responsable_id) {
        // Resolve agents.id → agents.user_id
        const { data: agent } = await db
          .from("agents")
          .select("user_id")
          .eq("id", immeuble.agent_responsable_id)
          .single();
        agentUserId = agent?.user_id || null;
      }

      if (agentUserId) {
        recipientUserIds.add(agentUserId);
      } else if (project.created_by) {
        recipientUserIds.add(project.created_by);
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

    for (const alert of alerts) {
      for (const recipientId of recipientUserIds) {
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
      }
    }

    return new Response(
      JSON.stringify({ dispatched, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
