import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OWNER_WHITELISTED_ACTIONS = [
  "project_created",
  "status_changed",
  "milestone_updated",
  "incident_created",
  "incident_resolved",
  "incident_updated",
  "reservation_resolved",
  "reservation_updated",
  "final_report_generated",
  "project_closed",
  "warranties_not_applicable",
];

const FINANCIAL_KEYS = [
  "estimated",
  "committed",
  "invoiced",
  "paid",
  "cost_impact",
  "budget_estimated",
  "budget_actual",
];

function stripFinancialKeys(obj: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!obj) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!FINANCIAL_KEYS.includes(k)) cleaned[k] = v;
  }
  return cleaned;
}

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Determine user role
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (roles || []).map((r: { role: string }) => r.role);
    const isAdmin = userRoles.includes("admin");
    const isAgent = userRoles.includes("agent");
    const isProprietaire = userRoles.includes("proprietaire");
    const isCompanyUser = userRoles.includes("company_user");

    // Company users get nothing
    if (isCompanyUser && !isAdmin && !isAgent) {
      return new Response(
        JSON.stringify({ entries: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId, limit: rawLimit, offset: rawOffset } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = Math.min(Number(rawLimit) || 100, 500);
    const offset = Number(rawOffset) || 0;

    // Verify project access for proprietaire
    if (isProprietaire && !isAdmin && !isAgent) {
      const { data: project } = await adminClient
        .from("renovation_projects")
        .select("immeuble_id")
        .eq("id", projectId)
        .single();

      if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: immeuble } = await adminClient
        .from("immeubles")
        .select("proprietaire_id")
        .eq("id", project.immeuble_id)
        .single();

      if (!immeuble?.proprietaire_id) {
        return new Response(JSON.stringify({ entries: [], total: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: prop } = await adminClient
        .from("proprietaires")
        .select("user_id")
        .eq("id", immeuble.proprietaire_id)
        .single();

      if (prop?.user_id !== userId) {
        return new Response(JSON.stringify({ entries: [], total: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Count total
    const { count: total } = await adminClient
      .from("renovation_audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    // Fetch entries
    let query = adminClient
      .from("renovation_audit_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: entries, error: fetchError } = await query;
    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let filtered = entries || [];

    // Proprietaire: whitelist + strip financial
    if (isProprietaire && !isAdmin && !isAgent) {
      filtered = filtered
        .filter((e: Record<string, unknown>) =>
          OWNER_WHITELISTED_ACTIONS.includes(e.action as string)
        )
        .map((e: Record<string, unknown>) => ({
          ...e,
          old_data: stripFinancialKeys(e.old_data as Record<string, unknown> | null),
          new_data: stripFinancialKeys(e.new_data as Record<string, unknown> | null),
        }));
    }

    return new Response(
      JSON.stringify({ entries: filtered, total: total || 0 }),
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
