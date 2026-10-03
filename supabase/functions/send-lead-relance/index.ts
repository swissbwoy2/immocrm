import { renderCorporateEmail, emailButton, escapeEmailHtml } from '../_shared/email-brand.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Offre {
  adresse: string;
  prix: number;
  pieces: number;
  surface: number;
  statut: string;
}

function formatPrix(prix: number): string {
  return prix.toLocaleString('fr-CH').replace(/,/g, "'");
}

function generateOffreCard(offre: Offre): string {
  const piecesLabel = offre.pieces <= 1.5 ? 'Studio' : `${offre.pieces} pièces`;
  const surfaceLabel = offre.surface ? `${offre.surface}m²` : '';
  const badge = offre.statut === 'envoyee' ? '<span style="display:inline-block;background:#f3f4ed;color:#5c665e;font-size:11px;font-weight:600;padding:3px 8px;border-radius:5px;">Disponible</span>'
    : '<span style="display:inline-block;background:#fef9c3;color:#5c665e;font-size:11px;font-weight:600;padding:3px 8px;border-radius:5px;">En cours</span>';

  return `<td width="50%" style="padding:8px;vertical-align:top;">
  <div style="border:1px solid #e5e7eb;border-radius:5px;overflow:hidden;">
    <div style="padding:12px;">
      <div style="font-size:16px;font-weight:800;color:#5c665e;">CHF ${formatPrix(offre.prix)}/mois</div>
      <div style="font-size:13px;color:#5c665e;font-weight:600;margin-top:4px;">📍 ${escapeEmailHtml(offre.adresse || 'Suisse romande')}</div>
      <div style="font-size:12px;color:#5c665e;margin-top:4px;">${piecesLabel}${surfaceLabel ? ' • ' + surfaceLabel : ''}</div>
      <div style="margin-top:8px;">${badge}</div>
    </div>
  </div>
</td>`;
}

function generateOffresSection(offres: Offre[]): string {
  if (offres.length === 0) return '';

  let rows = '';

  for (let i = 0; i < offres.length; i += 2) {
    const card1 = generateOffreCard(offres[i]);
    const card2 = i + 1 < offres.length
      ? generateOffreCard(offres[i + 1])
      : '<td width="50%" style="padding:8px;"></td>';
    rows += `<tr>${card1}${card2}</tr>`;
  }

  return `

<tr><td style="padding:25px 0 10px;text-align:center;">
  <h2 style="margin:0;font-size:20px;font-weight:700;color:#205a43;">📬 Offres déjà envoyées à nos clients</h2>
  <p style="margin:6px 0 0;font-size:13px;color:#5c665e;">Voici un extrait des biens que nos agents ont proposés cette semaine</p>
</td></tr>
<tr><td style="padding:15px 20px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows}
  </table>
</td></tr>


<tr><td style="padding:10px 0 25px;text-align:center;">
  ${emailButton(`Voir toutes les offres disponibles →`, `https://logisorama.ch/nouveau-mandat?utm_source=relance&utm_medium=email&utm_content=offres`)}
</td></tr>`;
}

function generateMarketingEmail(prenom: string, localite: string, budget: string, offres: Offre[]): string {
  return renderCorporateEmail({title:`${prenom}, tu cherches un appartement ? Est-ce que c’est toujours le cas ?`, category:'VOTRE RECHERCHE', bodyHtml:`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="padding:10px 0 25px;">
  <p style="margin:0;font-size:15px;color:#5c665e;line-height:1.7;text-align:center;">
    On sait que la recherche d'un logement en Suisse romande, c'est <strong>un vrai parcours du combattant</strong>. Avec un taux de vacance inférieur à 1%${localite ? ' dans la région de <strong>' + escapeEmailHtml(localite) + '</strong>' : ''}, les bons appartements partent en quelques heures.
  </p>
  <p style="margin:15px 0 0;font-size:15px;color:#5c665e;line-height:1.7;text-align:center;">
    C'est exactement pour ça qu'on a créé <strong>Logisorama</strong> : un service de recherche de logement qui travaille <em>pour toi</em>, pas contre toi. Et si tu n'as pas encore trouvé, <strong>on a de bonnes nouvelles</strong>.
  </p>
</td></tr>


<tr><td style="padding:0 40px;"><div style="height:1px;background:#f3f4ed;"></div></td></tr>


<tr><td style="padding:25px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:#f3f4ed;border-radius:5px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#5c665e;">1100+</div>
          <div style="font-size:11px;color:#5c665e;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Offres actives</div>
        </div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:#f3f4ed;border-radius:5px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#5c665e;">95%</div>
          <div style="font-size:11px;color:#5c665e;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Satisfaction</div>
        </div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:#f3f4ed;border-radius:5px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#5c665e;">48h</div>
          <div style="font-size:11px;color:#5c665e;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Délai moyen</div>
        </div>
      </td>
    </tr>
  </table>
</td></tr>


<tr><td style="padding:10px 0 5px;text-align:center;">
  <h2 style="margin:0;font-size:20px;font-weight:700;color:#205a43;">Comment ça marche ?</h2>
  <p style="margin:8px 0 0;font-size:14px;color:#5c665e;">3 étapes simples pour trouver ton logement</p>
</td></tr>

<tr><td style="padding:20px 0 25px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" style="text-align:center;padding:10px;vertical-align:top;">
        <div style="font-size:36px;margin-bottom:8px;">🔍</div>
        <div style="font-size:14px;font-weight:700;color:#5c665e;">1. On cherche</div>
        <div style="font-size:12px;color:#5c665e;margin-top:4px;line-height:1.4;">On active ta recherche personnalisée${budget ? ' dans ton budget de ' + escapeEmailHtml(budget) : ''}</div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;vertical-align:top;">
        <div style="font-size:36px;margin-bottom:8px;">🏠</div>
        <div style="font-size:14px;font-weight:700;color:#5c665e;">2. Tu visites</div>
        <div style="font-size:12px;color:#5c665e;margin-top:4px;line-height:1.4;">On organise les visites, tu choisis ton créneau</div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;vertical-align:top;">
        <div style="font-size:36px;margin-bottom:8px;">🔑</div>
        <div style="font-size:14px;font-weight:700;color:#5c665e;">3. Tu emménages</div>
        <div style="font-size:12px;color:#5c665e;margin-top:4px;line-height:1.4;">On gère le dossier, la régie, et le bail</div>
      </td>
    </tr>
  </table>
</td></tr>


<tr><td style="padding:0 40px;"><div style="height:1px;background:#f3f4ed;"></div></td></tr>


<tr><td style="padding:20px 0 5px;">
  <h2 style="margin:0;font-size:18px;font-weight:700;color:#205a43;text-align:center;">Ce qu'on fait pour toi</h2>
</td></tr>

<tr><td style="padding:15px 0 25px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#f3f4ed;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#5c665e;font-weight:500;">Recherche personnalisée et ciblée dans ta région</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#f3f4ed;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#5c665e;font-weight:500;">Visites organisées et accompagnées (ou déléguées)</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#f3f4ed;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#5c665e;font-weight:500;">Dossier optimisé pour convaincre les régies</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#f3f4ed;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#5c665e;font-weight:500;">Garantie 90 jours — trouvé ou remboursé</span></td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>


<tr><td style="padding:10px 0 30px;text-align:center;">
  ${emailButton(`Activer ma recherche →`, `https://logisorama.ch/nouveau-mandat?utm_source=relance&utm_medium=email`)}
</td></tr>


<tr><td style="padding:0 40px;"><div style="height:1px;background:#f3f4ed;"></div></td></tr>

${generateOffresSection(offres)}


<tr><td style="padding:0 40px;"><div style="height:1px;background:#f3f4ed;"></div></td></tr>


<tr><td style="padding:25px 0;text-align:center;">
  <div style="font-size:22px;letter-spacing:2px;">⭐⭐⭐⭐⭐</div>
  <p style="margin:8px 0 0;font-size:14px;color:#5c665e;line-height:1.5;">
    "Service exceptionnel, j'ai trouvé mon appartement en 3 semaines ! L'équipe est réactive et professionnelle."
  </p>
  <p style="margin:4px 0 0;font-size:13px;color:#5c665e;">— Sarah M., Lausanne • Google Reviews</p>
</td></tr>


<tr><td style="padding:0 40px;"><div style="height:1px;background:#f3f4ed;"></div></td></tr>


<tr><td style="padding:25px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="vertical-align:top;">
        <div style="font-size:16px;font-weight:700;color:#5c665e;">Christ Ramazani</div>
        <div style="font-size:13px;color:#5c665e;margin-top:2px;">Fondateur & CEO — Immo-rama.ch</div>
        <div style="margin-top:8px;">
          <a href="tel:+41764839199" style="font-size:13px;color:#205a43;text-decoration:none;">📞 +41 76 483 91 99</a>
        </div>
        <div style="margin-top:3px;">
          <a href="mailto:info@immo-rama.ch" style="font-size:13px;color:#205a43;text-decoration:none;">✉️ info@immo-rama.ch</a>
        </div>
        <div style="margin-top:8px;">
          <a href="https://www.linkedin.com/company/immo-rama" style="text-decoration:none;font-size:13px;color:#205a43;margin-right:12px;">LinkedIn</a>
          <a href="https://www.instagram.com/immo_rama" style="text-decoration:none;font-size:13px;color:#205a43;">Instagram</a>
        </div>
      </td>
    </tr>
  </table>
</td></tr>

</table>`,footerHtml:'Immo-rama.ch · Chemin de l’Esparcette 5, 1023 Crissier<br>Pour ne plus recevoir ces emails, répondez « STOP » à cet email.'});
}

async function fetchRandomOffres(supabase: ReturnType<typeof createClient>): Promise<Offre[]> {
  const categories = [
    { min: 0, max: 1.5 },    // Studio
    { min: 2, max: 2.5 },    // 2.5 pièces
    { min: 3, max: 3.5 },    // 3.5 pièces
  ];

  const offres: Offre[] = [];

  for (const cat of categories) {
    const { data, error } = await supabase
      .from('offres')
      .select('adresse, prix, pieces, surface, statut')
      .gte('pieces', cat.min)
      .lte('pieces', cat.max)
      .not('prix', 'is', null)
      .limit(10);

    if (!error && data && data.length > 0) {
      // Pick random from results
      const randomIndex = Math.floor(Math.random() * data.length);
      offres.push(data[randomIndex] as Offre);
    }
  }

  return offres;
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    const { lead_ids } = await req.json();
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      throw new Error('lead_ids array is required');
    }

    // Limit to 3 leads per invocation to avoid CPU timeout
    const limitedIds = lead_ids.slice(0, 3);

    // Get SMTP config: prefer the logged-in user's config, keep agency fallback ready
    const { data: userEmailConfig } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: agencyFallbackConfig } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('email_from', 'info@immo-rama.ch')
      .eq('is_active', true)
      .maybeSingle();

    let activeEmailConfig = userEmailConfig ?? agencyFallbackConfig;

    if (!activeEmailConfig) {
      throw new Error('Aucune configuration SMTP trouvée pour cet utilisateur (ni de fallback info@immo-rama.ch).');
    }

    // Get leads data
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email, prenom, nom, localite, budget')
      .in('id', limitedIds);

    if (leadsError || !leads || leads.length === 0) {
      throw new Error('Aucun lead trouvé');
    }

    // Fetch random offres from DB
    const offres = await fetchRandomOffres(supabase);

    const createSmtpClient = (config: any) => {
      const port = config.smtp_port || 465;
      const useTLS = port === 465;

      return new SMTPClient({
        connection: {
          hostname: config.smtp_host,
          port,
          tls: useTLS,
          auth: {
            username: config.smtp_user,
            password: config.smtp_password,
          },
        },
      });
    };

    const getFromAddress = (config: any) => config.display_name
      ? `${config.display_name} <${config.email_from}>`
      : config.email_from;

    const isSmtpAuthError = (message: string) =>
      /535|invalid login or password|authentication|auth failed/i.test(message);

    smtpClient = createSmtpClient(activeEmailConfig);
    let fromAddress = getFromAddress(activeEmailConfig);

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const prenom = lead.prenom || 'Bonjour';
      const localite = lead.localite || '';
      const budget = lead.budget || '';

      try {
        const subject = `${prenom}, tu cherches un appartement ? Est-ce que c'est toujours le cas ?`;
        const html = generateMarketingEmail(prenom, localite, budget, offres);

        try {
          await smtpClient.send({
            from: fromAddress,
            to: lead.email,
            subject,
            html,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err);
          const canFallback = !!agencyFallbackConfig && activeEmailConfig.id !== agencyFallbackConfig.id;

          if (!canFallback || !isSmtpAuthError(errorMessage)) {
            throw err;
          }

          console.warn(`SMTP auth failed for ${activeEmailConfig.email_from}, retrying with agency fallback info@immo-rama.ch`);

          try { await smtpClient.close(); } catch (_) { /* ignore */ }

          activeEmailConfig = agencyFallbackConfig;
          smtpClient = createSmtpClient(activeEmailConfig);
          fromAddress = getFromAddress(activeEmailConfig);

          await smtpClient.send({
            from: fromAddress,
            to: lead.email,
            subject,
            html,
          });
        }

        await supabase
          .from('leads')
          .update({ contacted: true })
          .eq('id', lead.id);

        sentCount++;
      } catch (err) {
        errorCount++;
        errors.push(`${lead.email}: ${err instanceof Error ? (err instanceof Error ? err.message : String(err)) : 'Unknown error'}`);
        console.error(`Failed to send to ${lead.email}:`, err);
      }

      // No sleep needed with small batches
    }

    await smtpClient.close();
    smtpClient = null;

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        errors: errorCount,
        error_details: errors.length > 0 ? errors : undefined,
        message: `${sentCount} email(s) envoyé(s) sur ${leads.length}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
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
