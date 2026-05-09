import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
// Utilise le même expéditeur que notify-new-lead / send-mandat-pdf (vérifié dans Resend)
const RAW_FROM = (Deno.env.get('RESEND_FROM_EMAIL') || '').trim();
const SENDER_EMAIL =
  RAW_FROM && RAW_FROM.includes('@') && !RAW_FROM.includes('notify.logisorama.ch')
    ? RAW_FROM
    : 'support@logisorama.ch';
const RESEND_FROM_EMAIL = SENDER_EMAIL.includes('<')
  ? SENDER_EMAIL
  : `Logisorama <${SENDER_EMAIL}>`;
const TEST_RECIPIENT = 'info@immo-rama.ch';
const PUBLIC_BASE_URL = 'https://logisorama.ch';
const MAX_LEADS_PER_INVOCATION = 500;
const SEND_DELAY_MS = 200;

// ────── Location campaign — configurable URLs & copy ──────
const LOCATION_CTA_RDV_HERO_URL =
  'https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_rdv_hero#analyse-dossier';
const LOCATION_CTA_RDV_FINAL_URL =
  'https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_rdv_final#analyse-dossier';
const LOCATION_CTA_ACTIVATION_URL =
  'https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_activation_secondaire#dossier-form';
const LOCATION_PREHEADER =
  'Passe 30 min avec un expert Logisorama pour vérifier ton dossier, tes critères et tes chances.';

// Sanitize a string for use in an email Subject header (no CRLF/control chars).
function sanitizeSubject(s: string): string {
  return (s || '').replace(/[\r\n\t\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, 180);
}

function buildLocationSubject(firstName: string): string {
  const fn = sanitizeSubject(firstName);
  return fn
    ? `${fn}, on analyse ta recherche d'appart gratuitement 👋`
    : `On analyse ta recherche d'appart gratuitement 👋`;
}

interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  subject: string;
  preview_text: string | null;
  hero_title: string;
  hero_subtitle: string | null;
  body_intro: string | null;
  benefits: string[];
  trust_text: string | null;
  cta_label: string;
  cta_url: string;
  signature: string | null;
  status: string;
}

interface LeadData {
  id?: string;
  first_name?: string | null;
  email: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FUNCTIONS_BASE = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1`;

function injectTracking(html: string, logId: string | null): string {
  if (!logId) return html;
  // Rewrite links to go through track-email-click
  let out = html.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*)>/gi, (m, pre, url, post) => {
    if (/^(mailto:|tel:|#)/i.test(url)) return m;
    if (url.includes('/functions/v1/track-email-')) return m;
    if (url.includes('/unsubscribe/')) return m;
    const tracked = `${FUNCTIONS_BASE}/track-email-click?id=${logId}&url=${encodeURIComponent(url)}`;
    return `<a ${pre}href="${tracked}"${post}>`;
  });
  // Inject open pixel just before </body>
  const pixel = `<img src="${FUNCTIONS_BASE}/track-email-open?id=${logId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;" />`;
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${pixel}</body>`);
  } else {
    out += pixel;
  }
  return out;
}

// ───────────────────────────────────────────────────────────
// LOCATION campaign — dedicated renderer (RDV-first design)
// ───────────────────────────────────────────────────────────
function renderLocationEmail(_campaign: Campaign, lead: LeadData, unsubscribeToken: string): string {
  const firstName = lead.first_name?.trim() || '';
  const greetingSuffix = firstName ? ` ${escapeHtml(firstName)}` : '';
  const unsubscribeUrl = `${PUBLIC_BASE_URL}/unsubscribe/${unsubscribeToken}`;
  const logoUrl = `${PUBLIC_BASE_URL}/email/logo-immo-rama.png`;

  const benefits = [
    'Clarifier tes critères de recherche',
    'Vérifier si ton dossier est suffisamment solide',
    'Identifier les logements qui correspondent vraiment à ta situation',
    'Comprendre comment augmenter tes chances auprès des régies',
    "Découvrir comment Logisorama peut t'accompagner jusqu'à la signature du bail",
  ]
    .map(
      (b) => `
        <tr>
          <td style="padding:9px 0;vertical-align:top;width:26px;">
            <div style="width:22px;height:22px;border-radius:50%;background:#D4A853;color:#1c1814;font-weight:700;font-size:13px;text-align:center;line-height:22px;font-family:Arial,sans-serif;">✓</div>
          </td>
          <td style="padding:9px 0 9px 12px;color:#e8dfce;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(b)}</td>
        </tr>`,
    )
    .join('');

  const trustCards = [
    { title: 'Agent dédié', text: "Un expert suit ta recherche et t'aide à cibler les bons logements." },
    { title: 'Dossier optimisé', text: "Ton dossier est mieux préparé avant d'être transmis aux régies." },
    { title: 'Visites déléguées', text: "Si tu n'es pas disponible, ton agent peut visiter pour toi." },
  ]
    .map(
      (c) => `
        <td class="trust-col" align="center" valign="top" width="33%" style="padding:8px;">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(212,168,83,0.22);border-radius:12px;padding:18px 14px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#D4A853;margin-bottom:6px;">${escapeHtml(c.title)}</div>
            <div style="font-size:13px;line-height:1.5;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(c.text)}</div>
          </div>
        </td>`,
    )
    .join('');

  // Primary CTA — bulletproof button (table + inline styles, works in Gmail/Apple Mail/Outlook)
  const ctaPrimary = (url: string, label: string) => `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;width:100%;max-width:320px;border-collapse:separate;">
          <tr>
            <td align="center" bgcolor="#D4A853" style="border-radius:10px;background:#D4A853;mso-padding-alt:18px 28px;box-shadow:0 6px 18px rgba(212,168,83,0.35);">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="18%" stroke="f" fillcolor="#D4A853">
                <w:anchorlock/>
                <center style="color:#1c1814;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(label)}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${url}" target="_blank" style="display:block;padding:18px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.2;color:#1c1814;text-decoration:none;border-radius:10px;letter-spacing:0.3px;text-align:center;">${escapeHtml(label)}</a>
              <!--<![endif]-->
            </td>
          </tr>
        </table>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(buildLocationSubject(firstName))}</title>
<style>
  @media only screen and (max-width: 600px) {
    .stack { display:block !important; width:100% !important; max-width:100% !important; }
    .px-mobile { padding-left:20px !important; padding-right:20px !important; }
    .h1-mobile { font-size:24px !important; line-height:1.25 !important; }
    .btn-primary, .btn-secondary { width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Arial,Helvetica,sans-serif;">
<!-- Preheader (hidden, shown in inbox preview) -->
<div style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#F5F5F0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(LOCATION_PREHEADER)}</div>
<div style="display:none;max-height:0;overflow:hidden;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F0;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:linear-gradient(180deg,#1c1814 0%,#231d18 100%);border-radius:14px;overflow:hidden;border:1px solid rgba(212,168,83,0.30);box-shadow:0 18px 50px rgba(0,0,0,0.22);">

      <!-- HERO -->
      <tr><td class="px-mobile" style="padding:36px 32px 16px;text-align:center;">
        <!-- Badge -->
        <div style="display:inline-block;background:rgba(212,168,83,0.10);border:1px solid rgba(212,168,83,0.45);border-radius:999px;padding:7px 16px;margin-bottom:20px;">
          <span style="font-size:12px;color:#E8C77E;font-weight:600;letter-spacing:0.4px;font-family:Arial,Helvetica,sans-serif;">👑 Service premium de recherche d'appartement en Suisse romande</span>
        </div>
        <!-- Logo -->
        <div style="margin:4px 0 18px;">
          <img src="${logoUrl}" alt="Immo-Rama" height="70" style="display:inline-block;height:70px;width:auto;max-width:160px;">
        </div>
        <!-- H1 -->
        <h1 class="h1-mobile" style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#f4ecd8;font-weight:700;font-family:Georgia,'Times New Roman',serif;">Bonjour${greetingSuffix}, viens faire analyser ta recherche gratuitement.</h1>
        <!-- Subtitle -->
        <p style="margin:0 auto 26px;max-width:480px;font-size:15px;line-height:1.6;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;">Tu cherches un appartement en Suisse romande ? Passe à nos bureaux de Crissier : un expert Logisorama analyse ton dossier, tes critères et ta situation en 30 minutes.</p>
        <!-- Primary CTA -->
        ${ctaPrimary(LOCATION_CTA_RDV_HERO_URL, '📍 Réserver mon RDV gratuit à Crissier')}
        <p style="margin:14px auto 0;max-width:380px;font-size:13px;line-height:1.5;color:#E8C77E;font-style:italic;font-family:Georgia,serif;">30 min avec un expert · 100&nbsp;% gratuit · Sans engagement</p>
      </td></tr>

      <!-- BENEFITS -->
      <tr><td class="px-mobile" style="padding:14px 32px 6px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(212,168,83,0.22);border-radius:12px;padding:18px 22px;">
          <div style="font-family:Georgia,serif;font-size:15px;color:#E8C77E;font-weight:700;margin-bottom:6px;">Pendant ton rendez-vous, on t'aide à :</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${benefits}</table>
        </div>
      </td></tr>

      <!-- SOCIAL PROOF -->
      <tr><td class="px-mobile" style="padding:22px 32px 4px;text-align:center;">
        <div style="font-size:14px;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;line-height:1.55;">
          <span style="color:#D4A853;letter-spacing:2px;">★ ★ ★ ★ ★</span><br>
          Plus de 500 locataires accompagnés en Suisse romande · <span style="color:#a89c87;">Avis Google vérifiés</span>
        </div>
      </td></tr>

      <!-- TRUST CARDS -->
      <tr><td class="px-mobile" style="padding:18px 24px 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>${trustCards}</tr>
        </table>
      </td></tr>

      <!-- FINAL CTA RDV -->
      <tr><td class="px-mobile" style="padding:26px 32px 6px;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:14px;color:#a89c87;margin-bottom:14px;font-style:italic;">Prêt à avancer ?</div>
        ${ctaPrimary(LOCATION_CTA_RDV_FINAL_URL, '📍 Fixer mon rendez-vous gratuit')}
        <div style="margin-top:14px;font-size:13px;color:#c9bfac;font-family:Arial,Helvetica,sans-serif;line-height:1.55;">
          Chemin de l'Esparsette 5, 1023 Crissier<br>
          <span style="color:#8a7f6e;">30 min · 1-to-1 avec un expert · Sans engagement</span>
        </div>
      </td></tr>

      <!-- ALT: ONLINE ACTIVATION -->
      <tr><td class="px-mobile" style="padding:30px 32px 6px;text-align:center;">
        <div style="height:1px;background:rgba(212,168,83,0.22);margin:0 auto 22px;max-width:240px;"></div>
        <div style="font-family:Georgia,serif;font-size:15px;color:#f4ecd8;font-weight:700;margin-bottom:6px;">Tu préfères commencer directement en ligne ?</div>
        <p style="margin:0 auto 16px;max-width:420px;font-size:13px;color:#a89c87;line-height:1.55;font-family:Arial,Helvetica,sans-serif;">Crée ton compte et indique tes critères en 2 minutes.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;width:100%;max-width:260px;border-collapse:separate;">
          <tr>
            <td align="center" bgcolor="#1c1814" style="border-radius:10px;background:#1c1814;border:2px solid #D4A853;mso-padding-alt:14px 28px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${LOCATION_CTA_ACTIVATION_URL}" style="height:46px;v-text-anchor:middle;width:260px;" arcsize="20%" strokecolor="#D4A853" strokeweight="2px" fillcolor="#1c1814">
                <w:anchorlock/>
                <center style="color:#D4A853;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Activer ma recherche en ligne</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${LOCATION_CTA_ACTIVATION_URL}" target="_blank" style="display:block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;line-height:1.2;color:#D4A853;text-decoration:none;border-radius:10px;letter-spacing:0.2px;text-align:center;">Activer ma recherche en ligne</a>
              <!--<![endif]-->
            </td>
          </tr>
        </table>
        <p style="margin:10px auto 0;max-width:380px;font-size:12px;color:#8a7f6e;font-style:italic;font-family:Georgia,serif;">Essai gratuit 48h · Sans engagement immédiat</p>
      </td></tr>

      <!-- GOOGLE REVIEWS COMPACT -->
      <tr><td class="px-mobile" style="padding:30px 32px 8px;text-align:center;">
        <div style="font-size:18px;letter-spacing:3px;color:#D4A853;line-height:1;margin-bottom:6px;">★ ★ ★ ★ ★</div>
        <div style="font-family:Georgia,serif;font-size:14px;color:#f4ecd8;font-weight:700;margin-bottom:4px;">Avis Google vérifiés</div>
        <p style="margin:0 0 10px;font-size:13px;color:#a89c87;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">Découvre les retours de nos clients accompagnés dans leur recherche de logement.</p>
        <a href="https://www.google.com/maps/place/Immo-rama.ch/@46.553728,6.572675,17z/data=!4m8!3m7!1s0x478c31710ee69131:0x868b9609d0284202!8m2!3d46.553728!4d6.572675!9m1!1b1" style="font-size:13px;color:#D4A853;text-decoration:underline;font-family:Arial,Helvetica,sans-serif;">Lire nos avis Google →</a>
      </td></tr>

      <!-- SIGNATURE -->
      <tr><td class="px-mobile" style="padding:28px 32px 18px;color:#c9bfac;font-size:14px;line-height:1.7;font-family:Georgia,serif;font-style:italic;">
        À très vite,<br>
        L'équipe Logisorama.ch<br>
        by Immo-Rama.ch
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#0e0c0a;padding:22px 28px;text-align:center;border-top:1px solid rgba(212,168,83,0.18);">
        <div style="color:#8a7f6e;font-size:12px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
          <strong style="color:#c9a96a;">Immo-Rama.ch</strong> · CHE-442.303.796<br>
          Suisse romande · <a href="${PUBLIC_BASE_URL}" style="color:#D4A853;text-decoration:none;">logisorama.ch</a>
        </div>
        <div style="margin-top:14px;color:#5a5246;font-size:11px;font-family:Arial,Helvetica,sans-serif;">
          Tu reçois cet email car tu as demandé des informations via l'une de nos campagnes.<br>
          <a href="${unsubscribeUrl}" style="color:#8a7f6e;text-decoration:underline;">Se désinscrire</a>
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function renderForCampaign(campaign: Campaign, lead: LeadData, unsubscribeToken: string): string {
  if (campaign.campaign_key === 'location') {
    return renderLocationEmail(campaign, lead, unsubscribeToken);
  }
  return renderEmail(campaign, lead, unsubscribeToken);
}

function subjectForCampaign(campaign: Campaign, lead: LeadData): string {
  if (campaign.campaign_key === 'location') {
    return buildLocationSubject(lead.first_name?.trim() || '');
  }
  return campaign.subject;
}

function renderEmail(campaign: Campaign, lead: LeadData, unsubscribeToken: string): string {
  const firstName = lead.first_name?.trim() || '';
  let intro = campaign.body_intro || '';
  if (firstName) {
    intro = intro.replace(/\{\{first_name\}\}/g, escapeHtml(firstName));
  } else {
    // Drop the placeholder cleanly so we get "Bonjour, …" instead of "Bonjour , …"
    intro = intro.replace(/\s*\{\{first_name\}\}/g, '').replace(/\{\{first_name\}\}/g, '');
  }
  const benefits = (campaign.benefits || [])
    .map(
      (b) => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;width:28px;">
          <div style="width:22px;height:22px;border-radius:50%;background:#b8893d;color:#1c1814;font-weight:700;font-size:13px;text-align:center;line-height:22px;font-family:Arial,sans-serif;">✓</div>
        </td>
        <td style="padding:10px 0 10px 14px;color:#e8dfce;font-size:15px;line-height:1.55;font-family:Arial,sans-serif;">${escapeHtml(b)}</td>
      </tr>`,
    )
    .join('');

  const signatureHtml = (campaign.signature || '').split('\n').map((l) => escapeHtml(l)).join('<br>');
  const unsubscribeUrl = `${PUBLIC_BASE_URL}/unsubscribe/${unsubscribeToken}`;
  const logoUrl = `${PUBLIC_BASE_URL}/email/logo-immo-rama.png`;

  // Parcours secondaires (mêmes que la home)
  const parcours: Array<{ label: string; url: string; icon: string }> = [
    { label: "Relouer mon appart'", url: `${PUBLIC_BASE_URL}/relouer-mon-appartement`, icon: '🔑' },
    { label: 'Vendre mon bien', url: `${PUBLIC_BASE_URL}/vendre-mon-bien`, icon: '🏛' },
    { label: 'Construire & rénover', url: `${PUBLIC_BASE_URL}/construire-renover`, icon: '🛠' },
  ];
  const parcoursHtml = parcours
    .map(
      (p) => `
      <td align="center" valign="top" width="33%" style="padding:6px;">
        <a href="${p.url}" style="display:block;text-decoration:none;background:rgba(255,255,255,0.03);border:1px solid rgba(184,137,61,0.25);border-radius:14px;padding:18px 10px;color:#e8dfce;font-family:Arial,sans-serif;">
          <div style="font-size:24px;line-height:1;margin-bottom:8px;color:#d4a857;">${p.icon}</div>
          <div style="font-size:13px;font-weight:600;color:#e8dfce;line-height:1.3;">${escapeHtml(p.label)}</div>
        </a>
      </td>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(campaign.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0e0c0a;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(campaign.preview_text || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0e0c0a;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#1c1814;border-radius:18px;overflow:hidden;border:1px solid rgba(184,137,61,0.18);box-shadow:0 20px 60px rgba(0,0,0,0.45);">

      <!-- TOP BAR -->
      <tr><td style="background:#0e0c0a;padding:12px 24px;text-align:center;border-bottom:1px solid rgba(184,137,61,0.15);">
        <span style="font-size:12px;color:#8a7f6e;font-family:Georgia,serif;letter-spacing:0.3px;">Un logiciel propulsé par <a href="${PUBLIC_BASE_URL}" style="color:#d4a857;text-decoration:none;font-weight:600;">Immo-rama.ch</a></span>
      </td></tr>

      <!-- HERO -->
      <tr><td style="background:#1c1814;padding:48px 32px 24px;text-align:center;">
        <!-- Badge couronne -->
        <div style="display:inline-block;background:linear-gradient(90deg,rgba(184,137,61,0.18),rgba(140,95,55,0.10));border:1px solid rgba(184,137,61,0.55);border-radius:999px;padding:8px 18px;margin-bottom:24px;">
          <span style="font-size:12px;color:#e0c089;font-weight:600;letter-spacing:0.6px;font-family:Arial,sans-serif;">👑 Agence N°1 de relocation en Suisse romande • Chasseur premium</span>
        </div>

        <!-- Logo -->
        <div style="margin:6px 0 22px;">
          <img src="${logoUrl}" alt="Immo-Rama" width="120" height="120" style="display:inline-block;width:120px;height:auto;filter:drop-shadow(0 0 24px rgba(184,137,61,0.35));">
        </div>

        <!-- Slogan -->
        <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#d4a857;font-weight:600;font-family:Arial,sans-serif;margin-bottom:18px;">L'immobilier accessible</div>

        <div style="height:1px;width:60px;background:#b8893d;margin:0 auto 28px;opacity:0.6;"></div>

        <!-- Titre principal -->
        <h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;color:#f4ecd8;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(campaign.hero_title)}</h1>
        ${campaign.preview_text ? `<p style="margin:0 auto 14px;max-width:520px;font-size:14px;line-height:1.55;color:#d4a857;font-weight:600;font-family:Arial,sans-serif;letter-spacing:0.2px;">${escapeHtml(campaign.preview_text)}</p>` : ''}
        ${campaign.hero_subtitle ? `<p style="margin:0 auto 30px;max-width:480px;font-size:16px;line-height:1.6;color:#c9bfac;font-family:Arial,sans-serif;">${escapeHtml(campaign.hero_subtitle)}</p>` : '<div style="height:24px;"></div>'}

        <!-- CTA principal -->
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${campaign.cta_url}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="20%" stroke="f" fillcolor="#b8893d">
          <w:anchorlock/>
          <center style="color:#1c1814;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(campaign.cta_label)}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${campaign.cta_url}" style="display:inline-block;background:linear-gradient(135deg,#d4a857 0%,#b8893d 100%);color:#1c1814;text-decoration:none;font-weight:700;font-size:15px;padding:17px 38px;border-radius:12px;font-family:Arial,sans-serif;letter-spacing:0.4px;box-shadow:0 8px 24px rgba(184,137,61,0.35);">🚀  ${escapeHtml(campaign.cta_label)}</a>
        <!--<![endif]-->

        <!-- Séparateur OU -->
        <div style="margin:26px auto 18px;display:flex;align-items:center;justify-content:center;max-width:280px;">
          <div style="flex:1;height:1px;background:rgba(184,137,61,0.3);"></div>
          <div style="padding:0 14px;color:#8a7f6e;font-size:11px;letter-spacing:3px;font-family:Arial,sans-serif;font-weight:600;">OU</div>
          <div style="flex:1;height:1px;background:rgba(184,137,61,0.3);"></div>
        </div>

        <!-- 2e CTA — RDV au bureau -->
        <a href="https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=${encodeURIComponent(campaign.campaign_key)}&utm_content=cta_rdv_bureau_hero#analyse-dossier" style="display:inline-block;background:transparent;border:2px solid #b8893d;color:#d4a857;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;line-height:1.3;">📍  Fixer un RDV gratuit à nos bureaux (30 min)</a>
        <p style="margin:12px auto 0;max-width:420px;font-size:13px;line-height:1.55;color:#a89b82;font-style:italic;font-family:Georgia,serif;">Un expert Logisorama vous accueille à Crissier et analyse votre dossier en direct — c'est <strong style="color:#d4a857;font-style:normal;">100&nbsp;% gratuit</strong>, durée 30&nbsp;min.</p>
      </td></tr>

      <!-- INTRO -->
      ${intro ? `<tr><td style="padding:28px 40px 8px;color:#d8cfba;font-size:16px;line-height:1.7;font-family:Arial,sans-serif;">${intro}</td></tr>` : ''}

      <!-- BENEFITS -->
      <tr><td style="padding:18px 40px 8px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(184,137,61,0.18);border-radius:14px;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${benefits}</table>
        </div>
      </td></tr>

      <!-- TRUST -->
      ${campaign.trust_text ? `<tr><td style="padding:24px 40px 0;text-align:center;color:#a89b82;font-size:14px;line-height:1.55;font-style:italic;font-family:Georgia,serif;">${escapeHtml(campaign.trust_text)}</td></tr>` : ''}

      <!-- AUTRES PARCOURS -->
      <tr><td style="padding:34px 32px 8px;text-align:center;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a7f6e;font-weight:600;margin-bottom:14px;font-family:Arial,sans-serif;">Autres parcours</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>${parcoursHtml}</tr>
        </table>
      </td></tr>

      <!-- CTA FINAL -->
      <tr><td style="padding:32px 40px 16px;text-align:center;">
        <a href="${campaign.cta_url}" style="display:inline-block;background:linear-gradient(135deg,#d4a857 0%,#b8893d 100%);color:#1c1814;text-decoration:none;font-weight:700;font-size:15px;padding:17px 42px;border-radius:12px;font-family:Arial,sans-serif;letter-spacing:0.4px;box-shadow:0 8px 24px rgba(184,137,61,0.35);">${escapeHtml(campaign.cta_label)}</a>
      </td></tr>

      <!-- AVIS GOOGLE — Preuve sociale -->
      <tr><td style="padding:8px 40px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(212,168,87,0.08) 0%,rgba(184,137,61,0.04) 100%);border:1px solid rgba(184,137,61,0.25);border-radius:14px;">
          <tr><td style="padding:24px 24px 22px;text-align:center;">
            <div style="font-size:22px;letter-spacing:4px;color:#d4a857;line-height:1;margin-bottom:10px;">★ ★ ★ ★ ★</div>
            <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#f4ecd8;margin-bottom:4px;">Avis Google vérifiés</div>
            <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#a89c87;font-family:Arial,sans-serif;">Découvrez les retours authentiques de nos clients relogés</p>
            <a href="https://www.google.com/maps/place/Immo-rama.ch/@46.553728,6.572675,17z/data=!4m8!3m7!1s0x478c31710ee69131:0x868b9609d0284202!8m2!3d46.553728!4d6.572675!9m1!1b1!16s%2Fg%2F11ml0y1pmv?entry=ttu&g_ep=EgoyMDI2MDQyOC4wIKXMDSoASAFQAw%3D%3D" style="display:inline-block;background:linear-gradient(135deg,#d4a857 0%,#b8893d 100%);color:#1c1814;text-decoration:none;font-weight:700;font-size:13px;padding:12px 26px;border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;box-shadow:0 6px 18px rgba(184,137,61,0.3);">⭐ Lire nos avis Google</a>
            <div style="margin-top:14px;">
              <a href="${PUBLIC_BASE_URL}/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=${encodeURIComponent(campaign.campaign_key)}&utm_content=avis_google_site#avis" style="font-size:12px;color:#b8893d;text-decoration:underline;font-family:Arial,sans-serif;">Voir tous les témoignages sur le site →</a>
            </div>
          </td></tr>
        </table>
      </td></tr>

      <!-- CTA FINAL — RDV au bureau -->
      <tr><td style="padding:0 40px 36px;text-align:center;">
        <div style="margin:0 auto 16px;max-width:280px;height:1px;background:rgba(184,137,61,0.25);"></div>
        <a href="https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=${encodeURIComponent(campaign.campaign_key)}&utm_content=cta_rdv_bureau_final#analyse-dossier" style="display:inline-block;background:transparent;border:2px solid #b8893d;color:#d4a857;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;">📍  Préférez un rendez-vous à nos bureaux&nbsp;?</a>
        <p style="margin:10px auto 0;max-width:380px;font-size:12px;line-height:1.5;color:#8a7f6e;font-family:Arial,sans-serif;">30 min avec un expert · Chemin de l'Esparsette 5, 1023 Crissier</p>
      </td></tr>

      <!-- SIGNATURE -->
      ${signatureHtml ? `<tr><td style="padding:0 40px 32px;color:#c9bfac;font-size:14px;line-height:1.7;font-family:Georgia,serif;font-style:italic;">${signatureHtml}</td></tr>` : ''}

      <!-- FOOTER -->
      <tr><td style="background:#0e0c0a;padding:26px 32px;text-align:center;border-top:1px solid rgba(184,137,61,0.15);">
        <div style="font-family:Georgia,serif;font-size:18px;color:#d4a857;font-weight:700;letter-spacing:0.5px;margin-bottom:4px;">Logisorama<span style="color:#f4ecd8;">.ch</span></div>
        <div style="color:#8a7f6e;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">
          by <strong style="color:#c9a96a;">Immo-Rama.ch</strong> &middot; CHE-442.303.796<br>
          Suisse romande &middot; <a href="${PUBLIC_BASE_URL}" style="color:#d4a857;text-decoration:none;">logisorama.ch</a>
        </div>
        <div style="margin-top:16px;color:#5a5246;font-size:11px;font-family:Arial,sans-serif;">
          Tu reçois cet email car tu nous as contactés via une de nos campagnes.<br>
          <a href="${unsubscribeUrl}" style="color:#8a7f6e;text-decoration:underline;">Se désinscrire</a>
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  options?: { bcc?: string[] }
): Promise<{ id?: string; error?: string }> {
  try {
    const payload: Record<string, unknown> = {
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject,
      html,
    };
    if (options?.bcc && options.bcc.length > 0) {
      payload.bcc = options.bcc;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { error: json?.message || `HTTP ${res.status}` };
    return { id: json.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Accès refusé (admin requis)' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const mode = body?.mode as 'preview' | 'test' | 'send';
    const campaignKey = body?.campaignKey as string;

    if (!mode || !campaignKey) {
      return new Response(JSON.stringify({ error: 'mode et campaignKey requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: campaign, error: cErr } = await supabaseAdmin
      .from('email_followup_campaigns')
      .select('*')
      .eq('campaign_key', campaignKey)
      .maybeSingle();

    if (cErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campagne introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const camp = campaign as Campaign;
    const fakeLead: LeadData = { first_name: '', email: TEST_RECIPIENT };

    // ───── PREVIEW
    if (mode === 'preview') {
      const html = renderForCampaign(camp, fakeLead, 'preview-token');
      const subject = subjectForCampaign(camp, fakeLead);
      return new Response(JSON.stringify({ html, subject }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ───── TEST
    if (mode === 'test') {
      const unsubToken = crypto.randomUUID();
      const testSubject = `[TEST] ${subjectForCampaign(camp, fakeLead)}`;
      const { data: preLog } = await supabaseAdmin
        .from('lead_email_logs')
        .insert({
          lead_id: null,
          campaign_id: camp.id,
          campaign_key: camp.campaign_key,
          recipient_email: TEST_RECIPIENT,
          subject: testSubject,
          status: 'pending',
          unsubscribe_token: unsubToken,
          test_send: true,
        })
        .select('id')
        .single();
      const logId = preLog?.id || null;
      const rawHtml = renderForCampaign(camp, fakeLead, unsubToken);
      const html = injectTracking(rawHtml, logId);
      const result = await sendViaResend(TEST_RECIPIENT, testSubject, html);

      if (logId) {
        await supabaseAdmin
          .from('lead_email_logs')
          .update({
            status: result.error ? 'failed' : 'sent',
            sent_at: result.error ? null : new Date().toISOString(),
            error_message: result.error || null,
            provider_message_id: result.id || null,
          })
          .eq('id', logId);
      }

      if (result.error) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, recipient: TEST_RECIPIENT }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ───── SEND
    if (mode === 'send') {
      if (camp.status !== 'active') {
        return new Response(JSON.stringify({ error: 'Campagne non active (statut: ' + camp.status + ')' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const leadIds = Array.isArray(body?.leadIds) ? body.leadIds.slice(0, MAX_LEADS_PER_INVOCATION) : [];
      const allowResend = body?.allowResend === true;
      if (leadIds.length === 0) {
        return new Response(JSON.stringify({ error: 'Aucun lead sélectionné' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: leads, error: lErr } = await supabaseAdmin
        .from('meta_leads')
        .select('id, email, first_name')
        .in('id', leadIds);

      if (lErr) {
        return new Response(JSON.stringify({ error: lErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Already-sent lookup (skip when allowResend = true)
      let sentSet = new Set<string>();
      if (!allowResend) {
        const { data: alreadySent } = await supabaseAdmin
          .from('lead_email_logs')
          .select('lead_id')
          .eq('campaign_id', camp.id)
          .eq('status', 'sent')
          .eq('test_send', false)
          .in('lead_id', leadIds);
        sentSet = new Set((alreadySent || []).map((r: any) => r.lead_id));
      }

      // Unsubscribed lookup
      const emails = (leads || []).map((l: any) => l.email).filter(Boolean);
      const { data: unsubs } = await supabaseAdmin
        .from('email_unsubscribes')
        .select('email')
        .in('email', emails);
      const unsubSet = new Set((unsubs || []).map((r: any) => r.email));

      let sent = 0;
      let failed = 0;
      let skippedAlready = 0;
      let skippedUnsub = 0;

      for (const lead of leads || []) {
        if (!lead.email) {
          failed++;
          continue;
        }
        if (sentSet.has(lead.id)) {
          skippedAlready++;
          continue;
        }
        if (unsubSet.has(lead.email)) {
          skippedUnsub++;
          await supabaseAdmin.from('lead_email_logs').insert({
            lead_id: lead.id,
            campaign_id: camp.id,
            campaign_key: camp.campaign_key,
            recipient_email: lead.email,
            subject: camp.subject,
            status: 'skipped',
            error_message: 'Email désinscrit',
          });
          continue;
        }

        const unsubToken = crypto.randomUUID();
        const personalizedSubject = subjectForCampaign(camp, lead);

        // Pre-insert log row (status pending) to get an id we can embed in tracking links
        const { data: preLog } = await supabaseAdmin
          .from('lead_email_logs')
          .insert({
            lead_id: lead.id,
            campaign_id: camp.id,
            campaign_key: camp.campaign_key,
            recipient_email: lead.email,
            subject: personalizedSubject,
            status: 'pending',
            unsubscribe_token: unsubToken,
            test_send: false,
          })
          .select('id')
          .single();

        const logId = preLog?.id || null;
        const rawHtml = renderForCampaign(camp, lead, unsubToken);
        const html = injectTracking(rawHtml, logId);
        const result = await sendViaResend(lead.email, personalizedSubject, html, {
          bcc: ['info@immo-rama.ch'],
        });

        if (logId) {
          await supabaseAdmin
            .from('lead_email_logs')
            .update({
              status: result.error ? 'failed' : 'sent',
              sent_at: result.error ? null : new Date().toISOString(),
              error_message: result.error || null,
              provider_message_id: result.id || null,
            })
            .eq('id', logId);
        }

        if (result.error) failed++;
        else sent++;

        await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
      }

      return new Response(
        JSON.stringify({
          success: true,
          total: leadIds.length,
          sent,
          failed,
          skipped_already_sent: skippedAlready,
          skipped_unsubscribed: skippedUnsub,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ error: 'mode invalide' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-followup-campaign error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
