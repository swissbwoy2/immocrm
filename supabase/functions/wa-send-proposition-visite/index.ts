// Send proposition_visite_client template (triggered by visite INSERT statut=proposee)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtDateFR(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-CH", {
    timeZone: "Europe/Zurich",
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { visite_id } = await req.json().catch(() => ({}));
  if (!visite_id) return new Response("missing visite_id", { status: 400, headers: corsHeaders });

  const { data: v } = await supabase
    .from("visites")
    .select("id, client_id, agent_id, date_visite, adresse")
    .eq("id", visite_id)
    .maybeSingle();
  if (!v?.client_id) return new Response("no client", { status: 200, headers: corsHeaders });

  const { data: client } = await supabase.from("clients").select("user_id").eq("id", v.client_id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();

  let agentName = "votre agent";
  if (v.agent_id) {
    const { data: agent } = await supabase.from("agents").select("user_id").eq("id", v.agent_id).maybeSingle();
    if (agent?.user_id) {
      const { data: ap } = await supabase.from("profiles").select("prenom, nom").eq("id", agent.user_id).maybeSingle();
      if (ap) agentName = `${ap.prenom || ""} ${ap.nom || ""}`.trim() || agentName;
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      event_type: "proposition_visite_client",
      template_key: "proposition_visite_client",
      client_id: v.client_id,
      variables: [profile?.prenom || "Client", v.adresse, fmtDateFR(v.date_visite), agentName],
      preference_key: "visit_reminders_enabled",
    }),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
