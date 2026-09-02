// Communication officielle aux clients actifs :
// 1) crée un ticket Support (trace in-app) pour chaque client actif ;
// 2) envoie l'email correspondant via send-transactional-email ;
// 3) idempotent grâce à broadcast_campaign_log (campaign_key + user_id).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { canSendNotificationEmail } from "../_shared/notificationEmailOptOut.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const CAMPAIGN_KEY = "service-notice-2026-09";
const SUJET = "Communication officielle — Traitement exclusif de vos demandes via l'onglet Support";

const TICKET_BODY = `Madame, Monsieur,

À la suite d'un incident technique général affectant nos canaux de communication depuis trois semaines, nous vous présentons nos excuses les plus sincères pour la gêne occasionnée. Afin de rétablir un suivi rigoureux et d'éviter toute confusion, les règles suivantes s'appliquent avec effet immédiat.

1. CANAL UNIQUE — SUPPORT
Toute demande doit être formulée exclusivement depuis l'onglet « Support » de votre espace client. Aucune demande transmise en dehors de l'application (WhatsApp, téléphone, SMS ou e-mail direct) ne sera traitée.

2. VISITES — INSTRUCTION ÉCRITE OBLIGATOIRE
Sans mention explicite de votre part transmise via l'application, aucune visite ne sera effectuée par l'agent en charge de votre dossier.

3. MISE À JOUR DE L'APPLICATION
Veuillez impérativement mettre à jour l'application, ou la télécharger, depuis l'App Store ou le Google Play Store. Cette mise à jour est indispensable au bon fonctionnement de votre espace.

4. DOCUMENTS ET SUIVI
Maintenez vos documents à jour afin de ne manquer aucune offre, et suivez rigoureusement l'avancement de votre recherche directement dans l'application.

5. DEMANDES DE REMBOURSEMENT
Toute demande de remboursement doit être effectuée via le bouton dédié situé sous l'onglet « Mon mandat / Mon contrat » de votre espace client. Aucune autre voie ne sera prise en compte.

Vous pouvez répondre directement à ce message : votre demande sera prise en charge par notre équipe.

Nous vous renouvelons nos excuses pour ce désagrément et vous remercions de votre compréhension.

L'équipe Logisorama — Immo-rama.ch
+41 21 634 31 61 · info@immo-rama.ch`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Autorisation : admin uniquement (ou service_role / secret interne) ---
  const caller = await verifyInternalCaller(req);
  const isAdmin = caller.ok &&
    (caller.kind === "service" || caller.kind === "secret" || (caller.roles || []).includes("admin"));
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: caller.userId ? 403 : 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dryRun === true;
  } catch {
    // corps vide = envoi réel
  }

  // --- Destinataires : clients actifs ---
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, user_id, statut")
    .eq("statut", "actif")
    .not("user_id", "is", null)
    .limit(15000);

  if (clientsError) {
    console.error("broadcast-service-notice: lecture clients impossible", clientsError);
    return new Response(JSON.stringify({ error: "Lecture des clients impossible" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = Array.from(new Set((clients || []).map((c: any) => c.user_id).filter(Boolean)));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, prenom, nom, email")
    .in("id", userIds);
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

  const { data: already } = await supabase
    .from("broadcast_campaign_log")
    .select("user_id")
    .eq("campaign_key", CAMPAIGN_KEY);
  const alreadySent = new Set((already || []).map((r: any) => r.user_id));

  const pending = userIds.filter((id) => !alreadySent.has(id));

  if (dryRun) {
    return new Response(
      JSON.stringify({
        dryRun: true,
        campaign_key: CAMPAIGN_KEY,
        clients_actifs: userIds.length,
        deja_traites: alreadySent.size,
        a_envoyer: pending.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const adminAuthorId = caller.userId ?? null;
  let tickets = 0;
  let emails = 0;
  let skippedEmails = 0;
  const errors: string[] = [];

  for (const userId of pending) {
    const profile: any = profileById.get(userId);
    try {
      // 1) Ticket support (trace in-app)
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          sujet: SUJET,
          categorie: "autre",
          statut: "nouveau",
          priorite: "haute",
        })
        .select("id")
        .single();

      if (ticketError || !ticket) throw new Error(ticketError?.message || "ticket_insert_failed");

      const { error: msgError } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        author_id: adminAuthorId ?? userId,
        author_role: "admin",
        body: TICKET_BODY,
      });
      if (msgError) throw new Error(msgError.message);
      tickets += 1;

      // 2) Email (respecte les désinscriptions)
      let emailStatus = "skipped";
      const gate = await canSendNotificationEmail(supabase as any, {
        userId,
        email: profile?.email ?? null,
      });

      if (gate.allowed && gate.email) {
        const { error: sendError } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "service-notice",
            recipientEmail: gate.email,
            idempotencyKey: `${CAMPAIGN_KEY}-${userId}`,
            templateData: { prenom: profile?.nom || profile?.prenom || undefined },
          },
        });
        if (sendError) throw new Error(`email: ${sendError.message}`);
        emailStatus = "sent";
        emails += 1;
      } else {
        skippedEmails += 1;
      }

      await supabase.from("broadcast_campaign_log").insert({
        campaign_key: CAMPAIGN_KEY,
        user_id: userId,
        ticket_id: ticket.id,
        email_status: emailStatus,
      });

      // Respiration pour éviter les limites de débit d'envoi
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("broadcast-service-notice: échec pour", userId, message);
      errors.push(`${userId}: ${message}`);
      await supabase.from("broadcast_campaign_log").insert({
        campaign_key: CAMPAIGN_KEY,
        user_id: userId,
        email_status: "failed",
        error_message: message.slice(0, 500),
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      campaign_key: CAMPAIGN_KEY,
      clients_actifs: userIds.length,
      traites: pending.length,
      tickets_crees: tickets,
      emails_envoyes: emails,
      emails_ignores: skippedEmails,
      erreurs: errors.length,
      details_erreurs: errors.slice(0, 10),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
