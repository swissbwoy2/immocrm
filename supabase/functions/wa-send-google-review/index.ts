// Cron J+3 after cles_remises: send google_review_request template
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

  // candidatures whose cles_remises_at = today - 3 days, not yet sent
  const targetDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);

  const { data: candidatures } = await supabase
    .from("candidatures")
    .select("id, client_id, cles_remises_at")
    .eq("cles_remises", true)
    .eq("avis_google_envoye", false)
    .gte("cles_remises_at", `${targetDate}T00:00:00Z`)
    .lte("cles_remises_at", `${targetDate}T23:59:59Z`)
    .limit(50);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  let sent = 0;

  for (const c of candidatures || []) {
    if (!c.client_id) continue;

    const { data: client } = await supabase.from("clients").select("user_id, agent_id").eq("id", c.client_id).maybeSingle();
    const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();
    let agentName = "votre agent";
    if (client?.agent_id) {
      const { data: agent } = await supabase.from("agents").select("user_id").eq("id", client.agent_id).maybeSingle();
      if (agent?.user_id) {
        const { data: ap } = await supabase.from("profiles").select("prenom").eq("id", agent.user_id).maybeSingle();
        if (ap?.prenom) agentName = ap.prenom;
      }
    }

    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        event_type: "google_review_request",
        template_key: "google_review_request",
        client_id: c.client_id,
        variables: [profile?.prenom || "Client", agentName],
      }),
    });

    await supabase
      .from("candidatures")
      .update({ avis_google_envoye: true })
      .eq("id", c.id);
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
