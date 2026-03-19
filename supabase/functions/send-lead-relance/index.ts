import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateMarketingEmail(prenom: string, localite: string, budget: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Logisorama - Trouvez votre logement</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;">
<tr><td align="center" style="padding:30px 15px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- HEADER GRADIENT -->
<tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5f8a 50%,#3b82b8 100%);padding:40px 40px 30px;text-align:center;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="text-align:center;">
      <div style="font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🏠 Logisorama</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px;">by Immo-rama.ch</div>
    </td></tr>
  </table>
</td></tr>

<!-- ACCROCHE -->
<tr><td style="padding:35px 40px 10px;text-align:center;">
  <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e3a5f;line-height:1.3;">
    ${prenom}, tu as déjà trouvé<br>ton futur logement ? 🤔
  </h1>
</td></tr>

<tr><td style="padding:10px 40px 25px;text-align:center;">
  <p style="margin:0;font-size:16px;color:#555;line-height:1.6;">
    Si ce n'est pas encore fait, <strong>pas de panique</strong>. On a de bonnes nouvelles pour toi${localite ? ' à <strong>' + localite + '</strong>' : ''}.
  </p>
</td></tr>

<!-- SEPARATOR -->
<tr><td style="padding:0 40px;">
  <div style="height:1px;background:linear-gradient(to right,transparent,#e0e6ed,transparent);"></div>
</td></tr>

<!-- STATS BLOCKS -->
<tr><td style="padding:25px 30px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:linear-gradient(135deg,#eef4ff,#dbeafe);border-radius:12px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#1e3a5f;">1100+</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Offres actives</div>
        </div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#15803d;">95%</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Satisfaction</div>
        </div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#a16207;">48h</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Délai moyen</div>
        </div>
      </td>
    </tr>
  </table>
</td></tr>

<!-- AVANTAGES -->
<tr><td style="padding:10px 40px 5px;">
  <h2 style="margin:0;font-size:18px;font-weight:700;color:#1e3a5f;text-align:center;">Ce qu'on fait pour toi</h2>
</td></tr>

<tr><td style="padding:15px 40px 25px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#dcfce7;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#374151;font-weight:500;">Recherche personnalisée${budget ? ' dans ton budget de ' + budget : ''}</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#dcfce7;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#374151;font-weight:500;">Visites organisées et accompagnées</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#dcfce7;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#374151;font-weight:500;">Dossier optimisé pour les régies</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#dcfce7;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#374151;font-weight:500;">Garantie 90 jours — trouvé ou remboursé</span></td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- CTA BUTTON -->
<tr><td style="padding:10px 40px 30px;text-align:center;">
  <a href="https://logisorama.ch/nouveau-mandat?utm_source=relance&utm_medium=email" 
     style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d5f8a);color:#ffffff;font-size:17px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(30,58,95,0.3);">
    Activer ma recherche →
  </a>
</td></tr>

<!-- AVIS GOOGLE -->
<tr><td style="padding:0 40px;">
  <div style="height:1px;background:linear-gradient(to right,transparent,#e0e6ed,transparent);"></div>
</td></tr>

<tr><td style="padding:25px 40px;text-align:center;">
  <div style="font-size:22px;letter-spacing:2px;">⭐⭐⭐⭐⭐</div>
  <p style="margin:8px 0 0;font-size:14px;color:#6b7280;font-style:italic;line-height:1.5;">
    "Service exceptionnel, j'ai trouvé mon appartement en 3 semaines !"
  </p>
  <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">— Client vérifié, Google Reviews</p>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#f8fafc;padding:25px 40px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
    <strong>Immo-rama.ch</strong> • Chemin de l'Esparcette 5, 1023 Crissier<br>
    CHE-442.303.796
  </p>
  <p style="margin:10px 0 0;font-size:11px;color:#c0c5cc;">
    Vous recevez cet email car vous avez rempli un formulaire sur logisorama.ch.<br>
    Pour ne plus recevoir ces emails, répondez "STOP" à cet email.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let smtpClient: SMTPClient | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    const { lead_ids } = await req.json();
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      throw new Error('lead_ids array is required');
    }

    // Get SMTP config
    const { data: emailConfig, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (configError || !emailConfig) {
      throw new Error('Aucune configuration email active trouvée. Configurez vos paramètres SMTP.');
    }

    // Get leads data
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email, prenom, nom, localite, budget')
      .in('id', lead_ids);

    if (leadsError || !leads || leads.length === 0) {
      throw new Error('Aucun lead trouvé');
    }

    // Setup SMTP
    const port = emailConfig.smtp_port || 465;
    const useTLS = port === 465;

    smtpClient = new SMTPClient({
      connection: {
        hostname: emailConfig.smtp_host,
        port,
        tls: useTLS,
        auth: {
          username: emailConfig.smtp_user,
          password: emailConfig.smtp_password,
        },
      },
    });

    const fromAddress = emailConfig.display_name
      ? `${emailConfig.display_name} <${emailConfig.email_from}>`
      : emailConfig.email_from;

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Send in batches of 10 with 1s delay
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const prenom = lead.prenom || 'Bonjour';
      const localite = lead.localite || '';
      const budget = lead.budget || '';

      try {
        const subject = `${prenom}, tu as déjà trouvé ton futur logement ?`;
        const html = generateMarketingEmail(prenom, localite, budget);

        await smtpClient.send({
          from: fromAddress,
          to: lead.email,
          subject,
          html,
        });

        // Mark as contacted
        await supabase
          .from('leads')
          .update({ contacted: true })
          .eq('id', lead.id);

        sentCount++;
      } catch (err) {
        errorCount++;
        errors.push(`${lead.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error(`Failed to send to ${lead.email}:`, err);
      }

      // Rate limiting: pause every 10 emails
      if ((i + 1) % 10 === 0 && i + 1 < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    await smtpClient.close();
    smtpClient = null;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errorCount,
        error_details: errors.length > 0 ? errors : undefined,
        message: `${sentCount} email(s) envoyé(s) sur ${leads.length}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-lead-relance:', error);

    if (smtpClient) {
      try { await smtpClient.close(); } catch (_) { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
