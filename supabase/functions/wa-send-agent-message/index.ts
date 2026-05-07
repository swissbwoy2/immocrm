// T14 — wa-send-agent-message (4 vars) — trigger when agent sends WA-relevant message
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadAgentName, callSendWhatsApp } from "../_shared/wa-helpers.ts";

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

  const { client_id, agent_id, message_extract, contexte } = await req.json().catch(() => ({}));
  if (!client_id || !message_extract) {
    return new Response(JSON.stringify({ error: "client_id + message_extract required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: client } = await supabase.from("clients").select("user_id, agent_id").eq("id", client_id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();
  const agentName = await loadAgentName(supabase, agent_id || client?.agent_id);

  const extract = String(message_extract).slice(0, 200) + (String(message_extract).length > 200 ? "…" : "");

  const result = await callSendWhatsApp({
    event_type: "agent_message",
    template_key: "agent_message",
    client_id,
    preference_key: "agent_messages_enabled",
    variables: [
      profile?.prenom || "Client",
      agentName,
      extract,
      contexte || "votre dossier",
    ],
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
