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

const UNSPLASH_IMAGES = [
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=200&fit=crop',
];

function formatPrix(prix: number): string {
  return prix.toLocaleString('fr-CH').replace(/,/g, "'");
}

function generateOffreCard(offre: Offre, imageUrl: string): string {
  const piecesLabel = offre.pieces <= 1.5 ? 'Studio' : `${offre.pieces} pièces`;
  const surfaceLabel = offre.surface ? `${offre.surface}m²` : '';
  const badge = offre.statut === 'envoyee' ? '<span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;">Disponible</span>'
    : '<span style="display:inline-block;background:#fef9c3;color:#a16207;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;">En cours</span>';

  return `<td width="50%" style="padding:8px;vertical-align:top;">
  <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <img src="${imageUrl}" alt="Appartement" style="width:100%;height:140px;object-fit:cover;display:block;" />
    <div style="padding:12px;">
      <div style="font-size:16px;font-weight:800;color:#1e3a5f;">CHF ${formatPrix(offre.prix)}/mois</div>
      <div style="font-size:13px;color:#374151;font-weight:600;margin-top:4px;">📍 ${offre.adresse || 'Suisse romande'}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">${piecesLabel}${surfaceLabel ? ' • ' + surfaceLabel : ''}</div>
      <div style="margin-top:8px;">${badge}</div>
    </div>
  </div>
</td>`;
}

function generateOffresSection(offres: Offre[]): string {
  if (offres.length === 0) return '';

  const shuffledImages = [...UNSPLASH_IMAGES].sort(() => Math.random() - 0.5);
  let rows = '';
  
  for (let i = 0; i < offres.length; i += 2) {
    const card1 = generateOffreCard(offres[i], shuffledImages[i % shuffledImages.length]);
    const card2 = i + 1 < offres.length 
      ? generateOffreCard(offres[i + 1], shuffledImages[(i + 1) % shuffledImages.length])
      : '<td width="50%" style="padding:8px;"></td>';
    rows += `<tr>${card1}${card2}</tr>`;
  }

  return `
<!-- SECTION OFFRES -->
<tr><td style="padding:25px 40px 10px;text-align:center;">
  <h2 style="margin:0;font-size:20px;font-weight:700;color:#1e3a5f;">📬 Offres déjà envoyées à nos clients</h2>
  <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Voici un extrait des biens que nos agents ont proposés cette semaine</p>
</td></tr>
<tr><td style="padding:15px 20px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows}
  </table>
</td></tr>

<!-- CTA SECONDAIRE -->
<tr><td style="padding:10px 40px 25px;text-align:center;">
  <a href="https://logisorama.ch/nouveau-mandat?utm_source=relance&utm_medium=email&utm_content=offres"
     style="display:inline-block;border:2px solid #1e3a5f;color:#1e3a5f;font-size:15px;font-weight:700;padding:12px 32px;border-radius:10px;text-decoration:none;">
    Voir toutes les offres disponibles →
  </a>
</td></tr>`;
}

function generateMarketingEmail(prenom: string, localite: string, budget: string, offres: Offre[]): string {
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

<!-- HEADER -->
<tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5f8a 50%,#3b82b8 100%);padding:20px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="text-align:left;">
        <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🏠 Logisorama</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;letter-spacing:1px;">by Immo-rama.ch</div>
      </td>
      <td style="text-align:right;vertical-align:middle;">
        <a href="tel:+41764839199" style="color:rgba(255,255,255,0.9);text-decoration:none;font-size:13px;font-weight:600;">📞 +41 76 483 91 99</a>
      </td>
    </tr>
  </table>
</td></tr>

<!-- HERO -->
<tr><td style="padding:40px 40px 15px;text-align:center;">
  <h1 style="margin:0;font-size:26px;font-weight:800;color:#1e3a5f;line-height:1.3;">
    ${prenom}, tu as déjà trouvé<br>ton futur logement ? 🤔
  </h1>
</td></tr>

<!-- PARAGRAPHE -->
<tr><td style="padding:10px 40px 25px;">
  <p style="margin:0;font-size:15px;color:#444;line-height:1.7;text-align:center;">
    On sait que la recherche d'un logement en Suisse romande, c'est <strong>un vrai parcours du combattant</strong>. Avec un taux de vacance inférieur à 1%${localite ? ' dans la région de <strong>' + localite + '</strong>' : ''}, les bons appartements partent en quelques heures.
  </p>
  <p style="margin:15px 0 0;font-size:15px;color:#444;line-height:1.7;text-align:center;">
    C'est exactement pour ça qu'on a créé <strong>Logisorama</strong> : un service de recherche de logement qui travaille <em>pour toi</em>, pas contre toi. Et si tu n'as pas encore trouvé, <strong>on a de bonnes nouvelles</strong>.
  </p>
</td></tr>

<!-- SEPARATOR -->
<tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(to right,transparent,#e0e6ed,transparent);"></div></td></tr>

<!-- STATS -->
<tr><td style="padding:25px 30px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:linear-gradient(135deg,#eef4ff,#dbeafe);border-radius:12px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#1e3a5f;">1100+</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Offres actives</div>
        </div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#15803d;">95%</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Satisfaction</div>
        </div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;">
        <div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;padding:20px 10px;">
          <div style="font-size:28px;font-weight:800;color:#a16207;">48h</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Délai moyen</div>
        </div>
      </td>
    </tr>
  </table>
</td></tr>

<!-- COMMENT CA MARCHE -->
<tr><td style="padding:10px 40px 5px;text-align:center;">
  <h2 style="margin:0;font-size:20px;font-weight:700;color:#1e3a5f;">Comment ça marche ?</h2>
  <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">3 étapes simples pour trouver ton logement</p>
</td></tr>

<tr><td style="padding:20px 30px 25px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" style="text-align:center;padding:10px;vertical-align:top;">
        <div style="font-size:36px;margin-bottom:8px;">🔍</div>
        <div style="font-size:14px;font-weight:700;color:#1e3a5f;">1. On cherche</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;line-height:1.4;">On active ta recherche personnalisée${budget ? ' dans ton budget de ' + budget : ''}</div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;vertical-align:top;">
        <div style="font-size:36px;margin-bottom:8px;">🏠</div>
        <div style="font-size:14px;font-weight:700;color:#1e3a5f;">2. Tu visites</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;line-height:1.4;">On organise les visites, tu choisis ton créneau</div>
      </td>
      <td width="33%" style="text-align:center;padding:10px;vertical-align:top;">
        <div style="font-size:36px;margin-bottom:8px;">🔑</div>
        <div style="font-size:14px;font-weight:700;color:#1e3a5f;">3. Tu emménages</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;line-height:1.4;">On gère le dossier, la régie, et le bail</div>
      </td>
    </tr>
  </table>
</td></tr>

<!-- SEPARATOR -->
<tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(to right,transparent,#e0e6ed,transparent);"></div></td></tr>

<!-- AVANTAGES -->
<tr><td style="padding:20px 40px 5px;">
  <h2 style="margin:0;font-size:18px;font-weight:700;color:#1e3a5f;text-align:center;">Ce qu'on fait pour toi</h2>
</td></tr>

<tr><td style="padding:15px 40px 25px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#dcfce7;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#374151;font-weight:500;">Recherche personnalisée et ciblée dans ta région</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#dcfce7;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#374151;font-weight:500;">Visites organisées et accompagnées (ou déléguées)</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;vertical-align:top;"><div style="background:#dcfce7;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;font-size:14px;">✅</div></td>
        <td style="padding-left:12px;"><span style="font-size:15px;color:#374151;font-weight:500;">Dossier optimisé pour convaincre les régies</span></td>
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

<!-- CTA PRINCIPAL -->
<tr><td style="padding:10px 40px 30px;text-align:center;">
  <a href="https://logisorama.ch/nouveau-mandat?utm_source=relance&utm_medium=email"
     style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d5f8a);color:#ffffff;font-size:17px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(30,58,95,0.3);">
    Activer ma recherche →
  </a>
</td></tr>

<!-- SEPARATOR -->
<tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(to right,transparent,#e0e6ed,transparent);"></div></td></tr>

${generateOffresSection(offres)}

<!-- SEPARATOR -->
<tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(to right,transparent,#e0e6ed,transparent);"></div></td></tr>

<!-- AVIS GOOGLE -->
<tr><td style="padding:25px 40px;text-align:center;">
  <div style="font-size:22px;letter-spacing:2px;">⭐⭐⭐⭐⭐</div>
  <p style="margin:8px 0 0;font-size:14px;color:#6b7280;font-style:italic;line-height:1.5;">
    "Service exceptionnel, j'ai trouvé mon appartement en 3 semaines ! L'équipe est réactive et professionnelle."
  </p>
  <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">— Sarah M., Lausanne • Google Reviews</p>
</td></tr>

<!-- SEPARATOR -->
<tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(to right,transparent,#e0e6ed,transparent);"></div></td></tr>

<!-- SIGNATURE -->
<tr><td style="padding:25px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="80" style="vertical-align:top;">
        <img src="https://logisorama.ch/team/christ-ramazani.png"
             alt="Christ Ramazani"
             style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid #1e3a5f;" />
      </td>
      <td style="padding-left:16px;vertical-align:top;">
        <div style="font-size:16px;font-weight:700;color:#1e3a5f;">Christ Ramazani</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px;">Fondateur & CEO — Immo-rama.ch</div>
        <div style="margin-top:8px;">
          <a href="tel:+41764839199" style="font-size:13px;color:#374151;text-decoration:none;">📞 +41 76 483 91 99</a>
        </div>
        <div style="margin-top:3px;">
          <a href="mailto:info@immo-rama.ch" style="font-size:13px;color:#374151;text-decoration:none;">✉️ info@immo-rama.ch</a>
        </div>
        <div style="margin-top:8px;">
          <a href="https://www.linkedin.com/company/immo-rama" style="text-decoration:none;font-size:13px;color:#0077b5;margin-right:12px;">LinkedIn</a>
          <a href="https://www.instagram.com/immo_rama" style="text-decoration:none;font-size:13px;color:#e1306c;">Instagram</a>
        </div>
      </td>
    </tr>
  </table>
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
      .in('id', limitedIds);

    if (leadsError || !leads || leads.length === 0) {
      throw new Error('Aucun lead trouvé');
    }

    // Fetch random offres from DB
    const offres = await fetchRandomOffres(supabase);

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

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const prenom = lead.prenom || 'Bonjour';
      const localite = lead.localite || '';
      const budget = lead.budget || '';

      try {
        const subject = `${prenom}, tu as déjà trouvé ton futur logement ?`;
        const html = generateMarketingEmail(prenom, localite, budget, offres);

        await smtpClient.send({
          from: fromAddress,
          to: lead.email,
          subject,
          html,
        });

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
