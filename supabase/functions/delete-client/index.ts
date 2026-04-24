import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnonymiseRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId }: AnonymiseRequest = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("[anonymise-client] start userId:", userId);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Identify caller (admin who triggers)
    let callerId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      callerId = userData.user?.id ?? null;
    }

    // 1) Load profile + client (snapshot)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, telephone")
      .eq("id", userId)
      .maybeSingle();

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, adresse")
      .eq("user_id", userId)
      .maybeSingle();

    if (!client) {
      console.warn("[anonymise-client] no client row found for", userId);
    }

    const clientId = client?.id ?? null;

    // 2) Audit snapshot (RGPD proof)
    let anonymisationId: string | null = null;
    if (clientId) {
      const { data: snap, error: snapErr } = await supabaseAdmin
        .from("client_anonymisations")
        .insert({
          client_id: clientId,
          user_id: userId,
          prenom: profile?.prenom ?? null,
          nom: profile?.nom ?? null,
          email: profile?.email ?? null,
          telephone: profile?.telephone ?? null,
          adresse: client?.adresse ?? null,
          anonymise_par: callerId,
        })
        .select("id")
        .single();
      if (snapErr) console.error("[anonymise-client] snapshot error:", snapErr);
      else anonymisationId = snap?.id ?? null;
    }

    // 3) Hard delete sensitive data
    if (clientId) {
      // Conversations + messages
      const { data: convs } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("client_id", clientId);
      if (convs && convs.length > 0) {
        const ids = convs.map((c: any) => c.id);
        await supabaseAdmin.from("messages").delete().in("conversation_id", ids);
        await supabaseAdmin.from("conversations").delete().in("id", ids);
      }

      // Candidatures (non-conclues laissent quand même la trace; on supprime tout sauf si liée à transaction)
      try {
        await supabaseAdmin.from("candidatures").delete().eq("client_id", clientId);
      } catch (e) {
        console.warn("[anonymise-client] candidatures delete skipped:", e);
      }

      // client_agents
      try {
        await supabaseAdmin.from("client_agents").delete().eq("client_id", clientId);
      } catch (e) {
        console.warn("[anonymise-client] client_agents skipped:", e);
      }

      // Documents table + storage
      try {
        await supabaseAdmin.from("documents").delete().eq("client_id", clientId);
      } catch (e) {
        console.warn("[anonymise-client] documents row delete skipped:", e);
      }
    }

    // Notifications + storage by user_id
    try {
      await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    } catch (e) {
      console.warn("[anonymise-client] notifications skipped:", e);
    }

    try {
      const { data: files } = await supabaseAdmin.storage
        .from("client-documents")
        .list(userId, { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f: any) => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from("client-documents").remove(paths);
      }
    } catch (e) {
      console.warn("[anonymise-client] storage cleanup skipped:", e);
    }

    // user_roles
    try {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    } catch (e) {
      console.warn("[anonymise-client] user_roles skipped:", e);
    }

    // 4) Anonymise clients row (NULL sensitive fields, keep id/user_id/agent_id/abaninja/etc.)
    if (clientId) {
      const { error: clientUpdErr } = await supabaseAdmin
        .from("clients")
        .update({
          nationalite: null,
          type_permis: null,
          residence: null,
          pieces: null,
          budget_max: null,
          situation_familiale: null,
          situation_financiere: null,
          profession: null,
          revenus_mensuels: null,
          source_revenus: null,
          type_contrat: null,
          secteur_activite: null,
          anciennete_mois: null,
          charges_mensuelles: null,
          autres_credits: null,
          apport_personnel: null,
          garanties: null,
          date_naissance: null,
          adresse: null,
          etat_civil: null,
          gerance_actuelle: null,
          contact_gerance: null,
          loyer_actuel: null,
          depuis_le: null,
          pieces_actuel: null,
          motif_changement: null,
          employeur: null,
          date_engagement: null,
          charges_extraordinaires: null,
          montant_charges_extra: null,
          poursuites: null,
          curatelle: null,
          souhaits_particuliers: null,
          nombre_occupants: null,
          utilisation_logement: null,
          animaux: null,
          instrument_musique: null,
          vehicules: null,
          numero_plaques: null,
          decouverte_agence: null,
          note_agent: null,
          mandat_pdf_url: null,
          mandat_signature_data: null,
          demande_mandat_id: null,
          statut: "inactif",
          anonymise_at: new Date().toISOString(),
          anonymise_motif: "RGPD - droit à l'effacement",
        })
        .eq("id", clientId);
      if (clientUpdErr) console.error("[anonymise-client] client update error:", clientUpdErr);
    }

    // 5) Profile: keep prenom/nom/email/telephone for accounting; mark anonymised + disable
    const { error: profUpdErr } = await supabaseAdmin
      .from("profiles")
      .update({
        actif: false,
        notifications_email: false,
        is_online: false,
        anonymise_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (profUpdErr) console.error("[anonymise-client] profile update error:", profUpdErr);

    // 6) Auth: ban + scramble email (no hard delete to keep FK integrity)
    try {
      const scrambledEmail = `anonymise+${userId}@deleted.local`;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: scrambledEmail,
        ban_duration: "876000h",
        user_metadata: { anonymised: true, anonymised_at: new Date().toISOString() },
      });
    } catch (e) {
      console.error("[anonymise-client] auth ban error:", e);
    }

    console.log("[anonymise-client] done", { userId, clientId, anonymisationId });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Client anonymisé (RGPD). Données comptables préservées.",
        anonymisation_id: anonymisationId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("[anonymise-client] fatal:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
