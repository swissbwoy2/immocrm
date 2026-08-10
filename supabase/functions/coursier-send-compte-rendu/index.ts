// Envoi du compte-rendu de visite aux clients concernés, déclenché par un COURSIER.
// Sécurité : le coursier authentifié doit être assigné à la visite (statut accepte/termine).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Non authentifié" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Session invalide" }, 401);

    const body = await req.json().catch(() => ({}));
    const visiteId: string | undefined = body?.visite_id;
    if (!visiteId || typeof visiteId !== "string") {
      return json({ error: "visite_id requis" }, 400);
    }

    // Compte démo → lecture seule
    const { data: profile } = await admin
      .from("profiles")
      .select("is_demo_account")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.is_demo_account) return json({ error: "Action indisponible en mode démo" }, 403);

    // Le user doit être un coursier
    const { data: coursier } = await admin
      .from("coursiers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!coursier) return json({ error: "Accès réservé aux coursiers" }, 403);

    // La visite doit lui être assignée
    const { data: visite } = await admin
      .from("visites")
      .select("id, adresse, date_visite, client_id, agent_id, offre_id, coursier_id, statut_coursier")
      .eq("id", visiteId)
      .maybeSingle();
    if (
      !visite ||
      visite.coursier_id !== coursier.id ||
      !["accepte", "termine"].includes(visite.statut_coursier ?? "")
    ) {
      return json({ error: "Mission non assignée à ce coursier" }, 403);
    }

    // Compte-rendu existant
    const { data: cr } = await admin
      .from("visite_comptes_rendus")
      .select("*")
      .eq("visite_id", visiteId)
      .maybeSingle();
    if (!cr) return json({ error: "Aucun compte-rendu à envoyer" }, 400);

    // Groupe : toutes SES visites à la même adresse et même horaire
    const { data: group } = await admin
      .from("visites")
      .select("id, client_id, agent_id, offre_id")
      .eq("coursier_id", coursier.id)
      .eq("adresse", visite.adresse)
      .eq("date_visite", visite.date_visite);

    const targets = new Map<string, any>();
    for (const v of group ?? [visite]) {
      if (v.client_id) targets.set(v.client_id, v);
    }
    if (visite.client_id && !targets.has(visite.client_id)) targets.set(visite.client_id, visite);
    if (targets.size === 0) return json({ error: "Aucun client lié à cette visite" }, 400);

    const label = (map: Record<string, string>, v: string | null) => (v ? map[v] ?? v : null);
    const lines: string[] = [`Compte-rendu de la visite — ${visite.adresse}`];
    const a = label(
      { tres_positif: "Très positif", positif: "Positif", mitige: "Mitigé", negatif: "Négatif" },
      cr.appreciation_globale,
    );
    const e = label(
      { excellent: "Excellent", bon: "Bon", moyen: "Moyen", a_renover: "À rénover" },
      cr.etat_general,
    );
    if (a) lines.push(`• Appréciation : ${a}`);
    if (e) lines.push(`• État : ${e}`);
    if (cr.points_forts?.length) lines.push(`• Points forts : ${cr.points_forts.join(", ")}`);
    if (cr.points_faibles?.length) lines.push(`• Points faibles : ${cr.points_faibles.join(", ")}`);
    if (cr.commentaire_libre) lines.push(`\n${cr.commentaire_libre}`);
    if (cr.prochaines_etapes) lines.push(`\nProchaines étapes : ${cr.prochaines_etapes}`);
    const recap = lines.join("\n");
    const medias: any[] = Array.isArray(cr.medias) ? cr.medias : [];

    let sent = 0;
    for (const [clientId, v] of targets) {
      try {
        const agentId = v.agent_id ?? visite.agent_id;
        let conversationId: string | null = null;

        const { data: conv } = await admin
          .from("conversations")
          .select("id")
          .eq("client_id", String(clientId))
          .eq("agent_id", String(agentId))
          .eq("conversation_type", "client-agent")
          .maybeSingle();
        conversationId = conv?.id ?? null;

        if (!conversationId) {
          const { data: newConv, error: convErr } = await admin
            .from("conversations")
            .insert({
              client_id: String(clientId),
              agent_id: String(agentId),
              conversation_type: "client-agent",
              subject: `Compte-rendu visite ${visite.adresse}`,
            })
            .select("id")
            .single();
          if (convErr) throw convErr;
          conversationId = newConv.id;
        }

        await admin.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: "agent",
          content: recap,
          offre_id: v.offre_id ?? visite.offre_id ?? null,
        });

        for (const m of medias) {
          await admin.from("messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            sender_type: "agent",
            content: m.name,
            attachment_url: m.url,
            attachment_type: m.type,
            attachment_name: m.name,
            attachment_size: m.size,
          });
        }

        // Notification in-app (+ push via trigger sur notifications)
        const { data: client } = await admin
          .from("clients")
          .select("user_id")
          .eq("id", clientId)
          .maybeSingle();
        if (client?.user_id) {
          await admin.rpc("create_notification", {
            p_user_id: client.user_id,
            p_type: "visite_compte_rendu",
            p_title: "Compte-rendu de visite disponible",
            p_message: `Le compte-rendu de la visite ${visite.adresse} est disponible.`,
            p_link: "/client/visites-deleguees",
            p_metadata: { visite_id: v.id, compte_rendu_id: cr.id },
          });
        }
        sent += 1;
      } catch (perClient) {
        console.error("[coursier-send-compte-rendu] échec client", clientId, perClient);
      }
    }

    const nowIso = new Date().toISOString();
    await admin
      .from("visite_comptes_rendus")
      .update({ envoye_au_client_at: nowIso, wa_envoye_at: nowIso })
      .eq("id", cr.id);

    return json({ ok: true, sent, envoye_au_client_at: nowIso });
  } catch (err) {
    console.error("[coursier-send-compte-rendu] erreur", err);
    return json({ error: (err as Error).message ?? "Erreur inattendue" }, 500);
  }
});
