// Send welcome WhatsApp to newly activated client
import { createClient } from "npm:@supabase/supabase-js@2";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const _deny = await denyIfNotInternal(req, corsHeaders, 'wa-send-welcome');
  if (_deny) return _deny;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { client_id } = await req.json().catch(() => ({}));
  if (!client_id) {
    return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: corsHeaders });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id")
    .eq("id", client_id)
    .maybeSingle();
  if (!client) {
    return new Response(JSON.stringify({ skipped: "client_not_found" }), { status: 200, headers: corsHeaders });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("prenom, whatsapp_phone, telephone, whatsapp_opt_in")
    .eq("id", client.user_id)
    .maybeSingle();

  const prenom = profile?.prenom || "Client";

  // Auto-enable opt-in on activation (client has signed the mandate consenting to communications)
  // and ensure whatsapp_phone is populated (fallback to telephone)
  const updates: Record<string, unknown> = {};
  if (profile?.whatsapp_opt_in !== true) updates.whatsapp_opt_in = true;
  if (!profile?.whatsapp_phone && profile?.telephone) updates.whatsapp_phone = profile.telephone;
  if (Object.keys(updates).length > 0) {
    await supabase.from("profiles").update(updates).eq("id", client.user_id);
  }

  // Resolve agent name
  let agentName = "votre agent";
  const { data: clientFull } = await supabase
    .from("clients").select("agent_id").eq("id", client_id).maybeSingle();
  if (clientFull?.agent_id) {
    const { data: ag } = await supabase
      .from("agents").select("user_id").eq("id", clientFull.agent_id).maybeSingle();
    if (ag?.user_id) {
      const { data: ap } = await supabase
        .from("profiles").select("prenom, nom").eq("id", ag.user_id).maybeSingle();
      const full = `${ap?.prenom || ""} ${ap?.nom || ""}`.trim();
      if (full) agentName = full;
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      event_type: "welcome_activation",
      template_key: "welcome_activation",
      client_id,
      header_params: [prenom],
      variables: [prenom, agentName],
    }),
  });
  const json = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: true, result: json }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
