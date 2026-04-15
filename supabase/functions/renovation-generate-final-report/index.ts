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

    const { projectId, force } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project } = await db
      .from("renovation_projects")
      .select(
        "*, immeubles(nom, adresse)"
      )
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotence: skip if report already exists and force != true
    const storagePath = `project/${projectId}/final-report.html`;
    if (project.final_report_path && !force) {
      const { data: signedData } = await db.storage
        .from("renovation-private")
        .createSignedUrl(storagePath, 3600);
      return new Response(
        JSON.stringify({
          path: storagePath,
          signedUrl: signedData?.signedUrl || null,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect data
    const [companies, budgetLines, milestones, incidents, reservations, warranties] =
      await Promise.all([
        db
          .from("renovation_project_companies")
          .select("role, renovation_companies(name, contact_name, phone, email)")
          .eq("project_id", projectId),
        db
          .from("renovation_budget_lines")
          .select("category, label, estimated, committed, invoiced, paid")
          .eq("project_id", projectId),
        db
          .from("renovation_milestones")
          .select("title, status, planned_date, actual_date, weight")
          .eq("project_id", projectId)
          .order("sort_order"),
        db
          .from("renovation_incidents")
          .select("title, severity, status, resolution, cost_impact, delay_impact_days")
          .eq("project_id", projectId)
          .in("severity", ["high", "critical"]),
        db
          .from("renovation_reservations")
          .select("title, description, status, severity, is_blocking")
          .eq("project_id", projectId),
        db
          .from("renovation_warranties")
          .select("warranty_type, category, equipment, brand, start_date, end_date, duration_months")
          .eq("project_id", projectId),
      ]);

    const budgetTotal = {
      estimated: (budgetLines.data || []).reduce((s: number, l: any) => s + (l.estimated || 0), 0),
      paid: (budgetLines.data || []).reduce((s: number, l: any) => s + (l.paid || 0), 0),
    };

    const buildingName =
      (project as any).immeubles?.nom || (project as any).immeubles?.adresse || "N/A";
    const reportDate = new Date().toLocaleDateString("fr-CH", {
      timeZone: "Europe/Zurich",
    });

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Dossier Final - ${escapeHtml(project.title)}</title>
<style>
body{font-family:Arial,sans-serif;margin:40px;color:#333;line-height:1.6}
h1{color:#1a1a2e;border-bottom:3px solid #16213e;padding-bottom:10px}
h2{color:#16213e;margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:5px}
table{width:100%;border-collapse:collapse;margin:15px 0}
th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
th{background:#f5f5f5;font-weight:600}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px}
.badge-critical{background:#fee;color:#c00}
.badge-warning{background:#fff3cd;color:#856404}
.badge-success{background:#d4edda;color:#155724}
.summary{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}
.summary-card{border:1px solid #ddd;border-radius:8px;padding:15px}
.footer{margin-top:40px;padding-top:20px;border-top:2px solid #16213e;font-size:12px;color:#666}
@media print{body{margin:20px}h1{page-break-before:avoid}}
</style>
</head>
<body>
<h1>Dossier Final de Rénovation</h1>

<div class="summary">
<div class="summary-card">
<strong>Projet:</strong> ${escapeHtml(project.title)}<br>
<strong>Immeuble:</strong> ${escapeHtml(buildingName)}<br>
<strong>Statut:</strong> ${escapeHtml(project.status)}<br>
<strong>Priorité:</strong> ${escapeHtml(project.priority)}
</div>
<div class="summary-card">
<strong>Dates prévues:</strong> ${project.start_date_planned || "N/A"} → ${project.end_date_planned || "N/A"}<br>
<strong>Dates réelles:</strong> ${project.start_date_actual || "N/A"} → ${project.end_date_actual || "N/A"}<br>
<strong>Budget estimé:</strong> CHF ${budgetTotal.estimated.toLocaleString("fr-CH")}<br>
<strong>Total payé:</strong> CHF ${budgetTotal.paid.toLocaleString("fr-CH")}
</div>
</div>

${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}

<h2>Chronologie (Jalons)</h2>
${
  milestones.data && milestones.data.length > 0
    ? `<table><tr><th>Jalon</th><th>Statut</th><th>Date prévue</th><th>Date réelle</th></tr>
${milestones.data
  .map(
    (m: any) =>
      `<tr><td>${escapeHtml(m.title)}</td><td>${escapeHtml(m.status)}</td><td>${m.planned_date || "-"}</td><td>${m.actual_date || "-"}</td></tr>`
  )
  .join("")}
</table>`
    : "<p>Aucun jalon défini.</p>"
}

<h2>Entreprises</h2>
${
  companies.data && companies.data.length > 0
    ? `<table><tr><th>Entreprise</th><th>Rôle</th><th>Contact</th><th>Téléphone</th></tr>
${companies.data
  .map(
    (c: any) =>
      `<tr><td>${escapeHtml((c as any).renovation_companies?.name || "N/A")}</td><td>${escapeHtml(c.role || "-")}</td><td>${escapeHtml((c as any).renovation_companies?.contact_name || "-")}</td><td>${escapeHtml((c as any).renovation_companies?.phone || "-")}</td></tr>`
  )
  .join("")}
</table>`
    : "<p>Aucune entreprise associée.</p>"
}

<h2>Budget</h2>
${
  budgetLines.data && budgetLines.data.length > 0
    ? `<table><tr><th>Catégorie</th><th>Label</th><th>Estimé</th><th>Engagé</th><th>Facturé</th><th>Payé</th></tr>
${budgetLines.data
  .map(
    (b: any) =>
      `<tr><td>${escapeHtml(b.category || "-")}</td><td>${escapeHtml(b.label || "-")}</td><td>${b.estimated || 0}</td><td>${b.committed || 0}</td><td>${b.invoiced || 0}</td><td>${b.paid || 0}</td></tr>`
  )
  .join("")}
</table>`
    : "<p>Aucune ligne budgétaire.</p>"
}

<h2>Incidents majeurs</h2>
${
  incidents.data && incidents.data.length > 0
    ? `<table><tr><th>Titre</th><th>Gravité</th><th>Statut</th><th>Impact coût</th><th>Impact délai (j)</th><th>Résolution</th></tr>
${incidents.data
  .map(
    (i: any) =>
      `<tr><td>${escapeHtml(i.title)}</td><td><span class="badge badge-${i.severity === "critical" ? "critical" : "warning"}">${escapeHtml(i.severity)}</span></td><td>${escapeHtml(i.status)}</td><td>${i.cost_impact || "-"}</td><td>${i.delay_impact_days || "-"}</td><td>${escapeHtml(i.resolution || "-")}</td></tr>`
  )
  .join("")}
</table>`
    : "<p>Aucun incident majeur.</p>"
}

<h2>Réserves</h2>
${
  reservations.data && reservations.data.length > 0
    ? `<table><tr><th>Titre</th><th>Gravité</th><th>Statut</th><th>Bloquante</th></tr>
${reservations.data
  .map(
    (r: any) =>
      `<tr><td>${escapeHtml(r.title || r.description?.substring(0, 80) || "Sans titre")}</td><td>${escapeHtml(r.severity || "-")}</td><td>${escapeHtml(r.status)}</td><td>${r.is_blocking ? "Oui" : "Non"}</td></tr>`
  )
  .join("")}
</table>`
    : "<p>Aucune réserve.</p>"
}

<h2>Garanties</h2>
${
  project.warranties_not_applicable
    ? "<p><em>Garanties marquées comme non applicables pour ce projet.</em></p>"
    : warranties.data && warranties.data.length > 0
    ? `<table><tr><th>Type</th><th>Catégorie</th><th>Équipement</th><th>Marque</th><th>Début</th><th>Fin</th><th>Durée (mois)</th></tr>
${warranties.data
  .map(
    (w: any) =>
      `<tr><td>${escapeHtml(w.warranty_type || "-")}</td><td>${escapeHtml(w.category || "-")}</td><td>${escapeHtml(w.equipment || "-")}</td><td>${escapeHtml(w.brand || "-")}</td><td>${w.start_date || "-"}</td><td>${w.end_date || "-"}</td><td>${w.duration_months || "-"}</td></tr>`
  )
  .join("")}
</table>`
    : "<p>Aucune garantie enregistrée.</p>"
}

<div class="footer">
Dossier généré le ${reportDate} — Logisorama by Immo-rama.ch
</div>
</body>
</html>`;

    // Upload to storage
    const encoder = new TextEncoder();
    const { error: uploadError } = await db.storage
      .from("renovation-private")
      .upload(storagePath, encoder.encode(html), {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update project
    await db
      .from("renovation_projects")
      .update({ final_report_path: storagePath })
      .eq("id", projectId);

    // Audit log
    await db.from("renovation_audit_logs").insert({
      project_id: projectId,
      user_id: userId,
      action: "final_report_generated",
      target_table: "renovation_projects",
      target_id: projectId,
      new_data: { path: storagePath },
    });

    // Signed URL
    const { data: signedData } = await db.storage
      .from("renovation-private")
      .createSignedUrl(storagePath, 3600);

    return new Response(
      JSON.stringify({
        path: storagePath,
        signedUrl: signedData?.signedUrl || null,
        cached: false,
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
