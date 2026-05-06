// Send welcome WhatsApp to newly activated client
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    .select("prenom")
    .eq("id", client.user_id)
    .maybeSingle();

  const prenom = profile?.prenom || "Client";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      event_type: "welcome_activation",
      template_key: "welcome_activation",
      client_id,
      variables: [prenom],
    }),
  });
  const json = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: true, result: json }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
