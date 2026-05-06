// Send signature_scheduled template
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtDateFR(d: string): string {
  return new Intl.DateTimeFormat("fr-CH", {
    timeZone: "Europe/Zurich",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { candidature_id } = await req.json().catch(() => ({}));
  if (!candidature_id) return new Response("missing", { status: 400, headers: corsHeaders });

  const { data: c } = await supabase
    .from("candidatures")
    .select("client_id, date_signature_choisie, lieu_signature")
    .eq("id", candidature_id)
    .maybeSingle();
  if (!c?.client_id || !c.date_signature_choisie) return new Response("no data", { status: 200, headers: corsHeaders });

  const { data: client } = await supabase.from("clients").select("user_id").eq("id", c.client_id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      event_type: "signature_scheduled",
      template_key: "signature_scheduled",
      client_id: c.client_id,
      variables: [
        profile?.prenom || "Client",
        fmtDateFR(c.date_signature_choisie),
        c.lieu_signature || "Chemin de l'Esparcette 5, 1023 Crissier",
      ],
      preference_key: "candidature_updates_enabled",
    }),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
