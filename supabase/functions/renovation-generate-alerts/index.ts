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

    // Check admin/agent
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

    const { data: project } = await db
      .from("renovation_projects")
      .select("id, budget_estimated, immeuble_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    interface AlertToUpsert {
      project_id: string;
      alert_type: string;
      severity: string;
      title: string;
      message: string;
      idempotency_key: string;
      target_table: string;
      target_id: string;
      is_resolved: boolean;
    }

    const alertsToUpsert: AlertToUpsert[] = [];
    const keysStillActive = new Set<string>();

    // 1. Budget overrun
    if (project.budget_estimated) {
      const { data: budgetLines } = await db
        .from("renovation_budget_lines")
        .select("paid")
        .eq("project_id", projectId);
      const totalPaid = (budgetLines || []).reduce(
        (sum: number, l: { paid: number | null }) => sum + (l.paid || 0),
        0
      );
      const key = `budget_overrun:${projectId}`;
      if (totalPaid > project.budget_estimated) {
        keysStillActive.add(key);
        alertsToUpsert.push({
          project_id: projectId,
          alert_type: "budget_overrun",
          severity: "warning",
          title: "Dépassement budgétaire",
          message: `Total payé (${totalPaid}) dépasse le budget estimé (${project.budget_estimated})`,
          idempotency_key: key,
          target_table: "renovation_projects",
          target_id: projectId,
          is_resolved: false,
        });
      }
    }

    // 2. Milestone overdue
    const { data: milestones } = await db
      .from("renovation_milestones")
      .select("id, title, planned_date, status")
      .eq("project_id", projectId)
      .not("status", "in", '("completed","cancelled")');
    for (const m of milestones || []) {
      if (m.planned_date && new Date(m.planned_date) < new Date()) {
        const key = `milestone_overdue:${m.id}`;
        keysStillActive.add(key);
        alertsToUpsert.push({
          project_id: projectId,
          alert_type: "milestone_overdue",
          severity: "warning",
          title: `Jalon en retard: ${m.title}`,
          message: `Date prévue: ${m.planned_date}`,
          idempotency_key: key,
          target_table: "renovation_milestones",
          target_id: m.id,
          is_resolved: false,
        });
      }
    }

    // 3. No update (14 days)
    const { data: lastUpdate } = await db
      .from("renovation_updates")
      .select("created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1);
    const noUpdateKey = `no_update:${projectId}`;
    if (lastUpdate && lastUpdate.length > 0) {
      const daysSince = (Date.now() - new Date(lastUpdate[0].created_at).getTime()) / 86400000;
      if (daysSince > 14) {
        keysStillActive.add(noUpdateKey);
        alertsToUpsert.push({
          project_id: projectId,
          alert_type: "no_update",
          severity: "info",
          title: "Aucune mise à jour depuis 14 jours",
          message: `Dernière mise à jour: ${lastUpdate[0].created_at}`,
          idempotency_key: noUpdateKey,
          target_table: "renovation_projects",
          target_id: projectId,
          is_resolved: false,
        });
      }
    }

    // 4. Critical incidents
    const { data: critIncidents } = await db
      .from("renovation_incidents")
      .select("id, title")
      .eq("project_id", projectId)
      .eq("severity", "critical")
      .not("status", "in", '("resolved","closed")');
    for (const inc of critIncidents || []) {
      const key = `incident_critical:${inc.id}`;
      keysStillActive.add(key);
      alertsToUpsert.push({
        project_id: projectId,
        alert_type: "incident_critical",
        severity: "critical",
        title: `Incident critique: ${inc.title}`,
        message: `Incident non résolu`,
        idempotency_key: key,
        target_table: "renovation_incidents",
        target_id: inc.id,
        is_resolved: false,
      });
    }

    // 5. Blocking reservations
    const { data: blockingRes } = await db
      .from("renovation_reservations")
      .select("id, title, description")
      .eq("project_id", projectId)
      .eq("is_blocking", true)
      .neq("status", "resolved");
    for (const res of blockingRes || []) {
      const key = `reservation_blocking:${res.id}`;
      keysStillActive.add(key);
      alertsToUpsert.push({
        project_id: projectId,
        alert_type: "reservation_blocking",
        severity: "warning",
        title: `Réserve bloquante: ${res.title || res.description?.substring(0, 50) || "Sans titre"}`,
        message: "Réserve bloquante non levée",
        idempotency_key: key,
        target_table: "renovation_reservations",
        target_id: res.id,
        is_resolved: false,
      });
    }

    // 6. Warranty expiring (90 days)
    const now = new Date();
    const in90 = new Date(now.getTime() + 90 * 86400000);
    const { data: expiringWarranties } = await db
      .from("renovation_warranties")
      .select("id, warranty_type, end_date")
      .eq("project_id", projectId)
      .gte("end_date", now.toISOString().split("T")[0])
      .lte("end_date", in90.toISOString().split("T")[0]);
    for (const w of expiringWarranties || []) {
      const key = `warranty_expiring:${w.id}`;
      keysStillActive.add(key);
      alertsToUpsert.push({
        project_id: projectId,
        alert_type: "warranty_expiring",
        severity: "info",
        title: `Garantie expirant: ${w.warranty_type || "N/A"}`,
        message: `Expire le ${w.end_date}`,
        idempotency_key: key,
        target_table: "renovation_warranties",
        target_id: w.id,
        is_resolved: false,
      });
    }

    // 7. Project not closable check
    const { data: closableCheck } = await db.rpc(
      "renovation_check_project_closable",
      { _project_id: projectId }
    );
    const notClosableKey = `project_not_closable:${projectId}`;
    if (closableCheck && !closableCheck.canClose) {
      keysStillActive.add(notClosableKey);
      alertsToUpsert.push({
        project_id: projectId,
        alert_type: "project_not_closable",
        severity: "info",
        title: "Projet non clôturable",
        message: (closableCheck.blockingReasons || []).join(", "),
        idempotency_key: notClosableKey,
        target_table: "renovation_projects",
        target_id: projectId,
        is_resolved: false,
      });
    }

    // Upsert alerts
    let created = 0;
    for (const alert of alertsToUpsert) {
      const { error } = await db.from("renovation_ai_alerts").upsert(alert, {
        onConflict: "idempotency_key",
      });
      if (!error) created++;
    }

    // Resolve alerts whose condition is no longer true
    const { data: existingAlerts } = await db
      .from("renovation_ai_alerts")
      .select("id, idempotency_key")
      .eq("project_id", projectId)
      .eq("is_resolved", false)
      .not("idempotency_key", "is", null);

    let resolved = 0;
    for (const ea of existingAlerts || []) {
      if (!keysStillActive.has(ea.idempotency_key)) {
        await db
          .from("renovation_ai_alerts")
          .update({ is_resolved: true, resolved_at: new Date().toISOString() })
          .eq("id", ea.id);
        resolved++;
      }
    }

    return new Response(
      JSON.stringify({
        alerts: alertsToUpsert.map((a) => a.idempotency_key),
        created,
        resolved,
      }),
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
