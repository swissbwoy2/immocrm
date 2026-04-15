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

    const { data: closableCheck, error: rpcError } = await db.rpc(
      "renovation_check_project_closable",
      { _project_id: projectId }
    );

    if (rpcError) {
      console.error(JSON.stringify({ event: "renovation_error", function: "renovation-close-project", project_id: projectId, error: `RPC error: ${rpcError.message}` }));
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!closableCheck?.canClose) {
      const reasons = closableCheck?.blockingReasons || [];
      console.error(JSON.stringify({ event: "renovation_error", function: "renovation-close-project", project_id: projectId, error: "Project not closable", context: { blocking_reasons: reasons } }));
      return new Response(
        JSON.stringify({
          closed: false,
          blockingReasons: reasons,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const closedAt = new Date().toISOString();
    const { error: updateError } = await db
      .from("renovation_projects")
      .update({
        status: "closed",
        closed_at: closedAt,
        closed_by: userId,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error(JSON.stringify({ event: "renovation_error", function: "renovation-close-project", project_id: projectId, error: updateError.message }));
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await db.from("renovation_audit_logs").insert({
      project_id: projectId,
      user_id: userId,
      action: "project_closed",
      target_table: "renovation_projects",
      target_id: projectId,
      old_data: null,
      new_data: { closed_at: closedAt, closed_by: userId },
    });

    return new Response(JSON.stringify({ closed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(JSON.stringify({ event: "renovation_error", function: "renovation-close-project", error: (err as Error).message }));
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
