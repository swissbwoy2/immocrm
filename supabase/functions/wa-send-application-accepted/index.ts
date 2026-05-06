// Send application_accepted template (triggered by candidatures.agent_valide_regie=true)
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

  const { candidature_id } = await req.json().catch(() => ({}));
  if (!candidature_id) return new Response("missing candidature_id", { status: 400, headers: corsHeaders });

  const { data: c } = await supabase
    .from("candidatures")
    .select("id, client_id, offre_id")
    .eq("id", candidature_id)
    .maybeSingle();
  if (!c?.client_id) return new Response("no client", { status: 200, headers: corsHeaders });

  const { data: offre } = await supabase.from("offres").select("adresse, loyer").eq("id", c.offre_id).maybeSingle();
  const { data: client } = await supabase.from("clients").select("user_id").eq("id", c.client_id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      event_type: "application_accepted",
      template_key: "application_accepted",
      client_id: c.client_id,
      variables: [
        profile?.prenom || "Client",
        offre?.adresse || "votre logement",
        offre?.loyer ? String(offre.loyer) : "—",
      ],
      preference_key: "candidature_updates_enabled",
    }),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
