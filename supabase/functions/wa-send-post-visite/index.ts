// Cron-driven: send post_visite_question 2h after visite effectuee
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

  // Visites effectuees, date_visite >= 2h ago, no question sent yet
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: visites } = await supabase
    .from("visites")
    .select("id, client_id, adresse, date_visite")
    .eq("statut", "effectuee")
    .eq("post_visit_question_sent", false)
    .lte("date_visite", twoHoursAgo)
    .limit(50);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  let sent = 0;

  for (const v of visites || []) {
    if (!v.client_id) continue;
    const { data: client } = await supabase.from("clients").select("user_id").eq("id", v.client_id).maybeSingle();
    const { data: profile } = await supabase.from("profiles").select("prenom").eq("id", client?.user_id).maybeSingle();

    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        event_type: "post_visite_question",
        template_key: "post_visite_question",
        client_id: v.client_id,
        variables: [profile?.prenom || "Client", v.adresse],
      }),
    });

    await supabase
      .from("visites")
      .update({ post_visit_question_sent: true, post_visit_question_sent_at: new Date().toISOString() })
      .eq("id", v.id);
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
