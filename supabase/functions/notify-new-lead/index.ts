import { trackedResendFetch } from "../_shared/tracked-resend.ts";
const sendTrackedEmail = trackedResendFetch("notify-new-lead");
import { renderCorporateEmail, emailButton, emailDetails, emailNotice, emailParagraph, escapeEmailHtml } from '../_shared/email-shell.ts';
import { formatCHF, formatDateTimeFR } from '../_shared/date-fr.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RAW_FROM = (Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
// Fallback to the verified Logisorama sender used by the rest of the project
const SENDER_EMAIL = RAW_FROM && RAW_FROM.includes("@") ? RAW_FROM : "support@logisorama.ch";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadNotificationRequest {
  email: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
  localite?: string;
  budget?: string;
  statut_emploi?: string;
  permis_nationalite?: string;
  poursuites?: boolean;
  a_garant?: boolean;
  is_qualified?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-new-lead function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData: LeadNotificationRequest = await req.json();
    console.log("New lead notification:", leadData);

    const adminEmail = "info@immo-rama.ch";

    const qualificationStatus = leadData.is_qualified
      ? "✅ QUALIFIÉ"
      : "❌ NON QUALIFIÉ";

    const qualificationReasons: string[] = [];
    if (leadData.statut_emploi !== 'salarie') {
      qualificationReasons.push("Non salarié");
    }
    if (!['B', 'C', 'Suisse'].includes(leadData.permis_nationalite || '')) {
      qualificationReasons.push("Permis non éligible");
    }
    if (leadData.poursuites && !leadData.a_garant) {
      qualificationReasons.push("Poursuites sans garant");
    }

    const res = await sendTrackedEmail("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Immo-Rama <${SENDER_EMAIL}>`,
        to: [adminEmail],
        subject: `${qualificationStatus} - Nouveau lead shortlist: ${leadData.prenom || ''} ${leadData.nom || ''}`,
html: renderCorporateEmail({
          title: 'Nouveau lead via le formulaire shortlist',
          preview: `${qualificationStatus} — ${`${leadData.prenom || ''} ${leadData.nom || ''}`.trim() || leadData.email}`,
          category: 'SUIVI ÉQUIPE',
          bodyHtml:
            emailNotice(
              !leadData.is_qualified && qualificationReasons.length > 0
                ? `Raisons : ${escapeEmailHtml(qualificationReasons.join(', '))}`
                : '',
              leadData.is_qualified ? 'info' : 'danger',
              qualificationStatus,
            ) +
            emailDetails([
              ['Prénom', leadData.prenom || 'Non renseigné'],
              ['Nom', leadData.nom || 'Non renseigné'],
              ['Email', leadData.email],
              ['Téléphone', leadData.telephone || 'Non renseigné'],
            ], 'Informations personnelles') +
            emailDetails([
              ['Localité', leadData.localite || 'Non renseignée'],
              ['Budget', leadData.budget ? (/^\s*[\d'’ .,]+\s*$/.test(String(leadData.budget)) ? formatCHF(String(leadData.budget).replace(/['’ ]/g, '')) : leadData.budget) : 'Non renseigné'],
            ], 'Critères de recherche') +
            emailDetails([
              ['Statut emploi', leadData.statut_emploi === 'salarie' ? 'Salarié(e)' : 'Autre'],
              ['Permis/Nationalité', leadData.permis_nationalite || 'Non renseigné'],
              ['Poursuites', leadData.poursuites ? 'Oui' : 'Non'],
              ...(leadData.poursuites ? [['A un garant', leadData.a_garant ? 'Oui' : 'Non'] as [string, unknown]] : []),
            ], 'Qualification') +
            ((leadData.utm_source || leadData.utm_medium || leadData.utm_campaign)
              ? emailDetails([
                ...(leadData.utm_source ? [['Source', leadData.utm_source] as [string, unknown]] : []),
                ...(leadData.utm_medium ? [['Medium', leadData.utm_medium] as [string, unknown]] : []),
                ...(leadData.utm_campaign ? [['Campagne', leadData.utm_campaign] as [string, unknown]] : []),
              ], 'Source marketing')
              : emailDetails([['Source', 'Organique (pas de paramètre UTM)']], 'Source marketing')) +
            emailParagraph(`Lead reçu le ${escapeEmailHtml(formatDateTimeFR(new Date(), { weekday: false }))}`, true) +
            emailButton('Voir tous les leads', 'https://logisorama.ch/admin/leads'),
        }),
      }),
    });

    const data = await res.json();
    console.log("Email sent result:", data);

    if (!res.ok) {
      // Do not fail the lead capture flow if email cannot be sent
      // (e.g. Resend daily quota exceeded). Log and return 200.
      console.error("Resend API error (non-blocking):", data);
      return new Response(
        JSON.stringify({ success: false, emailSkipped: true, reason: data?.message || "email_failed" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-new-lead function (non-blocking):", error);
    // Never break the lead capture flow because of email errors
    return new Response(
      JSON.stringify({ success: false, emailSkipped: true, reason: error instanceof Error ? error.message : String(error) }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
