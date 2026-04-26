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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Immo-Rama <${SENDER_EMAIL}>`,
        to: [adminEmail],
        subject: `${qualificationStatus} - Nouveau lead shortlist: ${leadData.prenom || ''} ${leadData.nom || ''}`,
        html: `
          <h2>Nouveau lead via le formulaire shortlist</h2>
          
          <div style="background-color: ${leadData.is_qualified ? '#d4edda' : '#f8d7da'}; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <strong style="font-size: 18px;">${qualificationStatus}</strong>
            ${!leadData.is_qualified && qualificationReasons.length > 0 ? `
              <p style="margin: 10px 0 0 0; color: #721c24;">
                Raisons: ${qualificationReasons.join(', ')}
              </p>
            ` : ''}
          </div>
          
          <h3>👤 Informations personnelles</h3>
          <ul>
            <li><strong>Prénom:</strong> ${leadData.prenom || 'Non renseigné'}</li>
            <li><strong>Nom:</strong> ${leadData.nom || 'Non renseigné'}</li>
            <li><strong>Email:</strong> ${leadData.email}</li>
            <li><strong>Téléphone:</strong> ${leadData.telephone || 'Non renseigné'}</li>
          </ul>
          
          <h3>🏠 Critères de recherche</h3>
          <ul>
            <li><strong>Localité:</strong> ${leadData.localite || 'Non renseignée'}</li>
            <li><strong>Budget:</strong> ${leadData.budget || 'Non renseigné'}</li>
          </ul>
          
          <h3>📋 Qualification</h3>
          <ul>
            <li><strong>Statut emploi:</strong> ${leadData.statut_emploi === 'salarie' ? 'Salarié(e)' : 'Autre'}</li>
            <li><strong>Permis/Nationalité:</strong> ${leadData.permis_nationalite || 'Non renseigné'}</li>
            <li><strong>Poursuites:</strong> ${leadData.poursuites ? 'Oui' : 'Non'}</li>
            ${leadData.poursuites ? `<li><strong>A un garant:</strong> ${leadData.a_garant ? 'Oui' : 'Non'}</li>` : ''}
          </ul>
          
          ${(leadData.utm_source || leadData.utm_medium || leadData.utm_campaign) ? `
          <h3>📊 Source marketing</h3>
          <ul>
            ${leadData.utm_source ? `<li><strong>Source:</strong> ${leadData.utm_source}</li>` : ''}
            ${leadData.utm_medium ? `<li><strong>Medium:</strong> ${leadData.utm_medium}</li>` : ''}
            ${leadData.utm_campaign ? `<li><strong>Campagne:</strong> ${leadData.utm_campaign}</li>` : ''}
          </ul>
          ` : `
          <h3>📊 Source marketing</h3>
          <p style="color: #888;">Organique (pas de paramètre UTM)</p>
          `}
          
          <hr style="margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">
            Lead reçu le ${new Date().toLocaleDateString('fr-CH', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          
          <a href="https://app.immo-rama.ch/admin/leads" 
             style="display: inline-block; background: #e94560; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Voir tous les leads
          </a>
        `,
      }),
    });

    const data = await res.json();
    console.log("Email sent result:", data);

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-new-lead function:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
