import { trackedResendFetch } from "../_shared/tracked-resend.ts";
const sendTrackedEmail = trackedResendFetch("send-followup-campaign");
import { renderCorporateEmail, emailButton } from '../_shared/email-brand.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
  '🏠 Tu cherches un appartement en Suisse romande ?';
const LOCATION_CTA_NOUVEAU_MANDAT_URL =
  'https://logisorama.ch/nouveau-mandat?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_activation_inline';

// Sanitize a string for use in an email Subject header (no CRLF/control chars).
function sanitizeSubject(s: string): string {
  return (s || '').replace(/[\r\n\t\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, 180);
}

function buildLocationSubject(_firstName: string): string {
  return `Ton futur appartement t'attend !!!`;
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
    const tracked = `${FUNCTIONS_BASE}/track-email-click?id=${logId}&url=${encodeURIComponent(url.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))}`;
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
  const greeting = firstName ? `Bonjour ${escapeHtml(firstName)},` : 'Bonjour,';
  const unsubscribeUrl = `${PUBLIC_BASE_URL}/unsubscribe/${unsubscribeToken}`;
  return renderCorporateEmail({title:buildLocationSubject(firstName), preview:LOCATION_PREHEADER, category:'VOTRE RECHERCHE', bodyHtml:`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:8px 0 6px;">
        <p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#5c665e;font-family:Arial,Helvetica,sans-serif;">${greeting} 👋</p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#5c665e;font-family:Arial,Helvetica,sans-serif;">Merci infiniment pour l'intérêt que tu portes à nos services — c'est déjà un excellent premier pas vers <strong style="color:#205a43;">ton futur appartement</strong>.</p>
      </td></tr>


      <tr><td style="padding:8px 0 4px;">
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#5c665e;font-family:Arial,Helvetica,sans-serif;">👉 Pour profiter pleinement de notre accompagnement premium et activer ta recherche <strong style="color:#205a43;">dès aujourd'hui</strong>, une seule étape : rends-toi sur <a href="${LOCATION_CTA_ACTIVATION_URL}" target="_blank" style="color:#205a43;text-decoration:underline;font-weight:700;">logisorama.ch</a>. En moins de 2 minutes, ton dossier est lancé et notre équipe se met immédiatement en chasse pour toi.</p>
        ${emailButton('Activer ma recherche maintenant', LOCATION_CTA_ACTIVATION_URL)}
      </td></tr>


      <tr><td style="padding:24px 0 6px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:#5c665e;font-family:Arial,Helvetica,sans-serif;">Sur le site, tu trouveras également toutes nos <strong style="color:#205a43;">modalités</strong>, nos tarifs transparents et les témoignages de <strong style="color:#205a43;">centaines de locataires</strong> que nous avons déjà relogés en Suisse romande.</p>
      </td></tr>


      <tr><td style="padding:18px 0 6px;">
        <div style="background:#f3f4ed;border-left:3px solid #205a43;border-radius:5px;padding:14px 16px;">
          <p style="margin:0;font-size:14px;line-height:1.65;color:#5c665e;font-family:Arial,Helvetica,sans-serif;">⏰ <strong>Chaque jour compte</strong> sur le marché locatif romand — les meilleurs biens partent en quelques heures. Plus tôt ton dossier est activé, plus vite nous pouvons agir.</p>
        </div>
      </td></tr>


      <tr><td style="padding:22px 0 4px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:#5c665e;font-family:Arial,Helvetica,sans-serif;">Et bien évidemment, si tu as la moindre question, notre équipe reste entièrement à ta disposition — réponds simplement à cet email, nous te répondrons personnellement.</p>
      </td></tr>


      <tr><td style="padding:18px 0 6px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:#5c665e;font-family:Arial,Helvetica,sans-serif;">Au plaisir de te faire visiter ton prochain chez-toi très bientôt 🔑</p>
      </td></tr>


      <tr><td style="padding:22px 0 22px;color:#5c665e;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;text-align:center;">
        Cordialement,<br>L'équipe Immo-rama.ch
      </td></tr>

      </table>`, footerHtml:`CHE-442.303.796 · Suisse romande<br>Tu reçois cet email car tu as demandé des informations via l’une de nos campagnes.<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#205a43;">Se désinscrire</a>`});
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
          <div style="width:22px;height:22px;border-radius:50%;background:#205a43;color:#ffffff;font-weight:700;font-size:13px;text-align:center;line-height:22px;font-family:Arial,sans-serif;">✓</div>
        </td>
        <td style="padding:10px 0 10px 14px;color:#5c665e;font-size:15px;line-height:1.55;font-family:Arial,sans-serif;">${escapeHtml(b)}</td>
      </tr>`,
    )
    .join('');

  const signatureHtml = (campaign.signature || '').split('\n').map((l) => escapeHtml(l)).join('<br>');
  const unsubscribeUrl = `${PUBLIC_BASE_URL}/unsubscribe/${unsubscribeToken}`;

  // Parcours secondaires (mêmes que la home)
  const parcours: Array<{ label: string; url: string; icon: string }> = [
    { label: "Relouer mon appart'", url: `${PUBLIC_BASE_URL}/relouer-mon-appartement`, icon: '🔑' },
    { label: 'Vendre mon bien', url: `${PUBLIC_BASE_URL}/vendre-mon-bien`, icon: '🏛' },
    { label: 'Construire & rénover', url: `${PUBLIC_BASE_URL}/construire-renover`, icon: '🛠' },
  ];
  const parcoursHtml = parcours
    .map(
      (p) => `
      <tr><td style="padding:6px 0;">
        <a href="${p.url}" style="display:block;text-decoration:none;background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:18px 10px;color:#205a43;font-family:Arial,sans-serif;">
          <div style="font-size:24px;line-height:1;margin-bottom:8px;color:#5c665e;">${p.icon}</div>
          <div style="font-size:13px;font-weight:600;color:#5c665e;line-height:1.3;">${escapeHtml(p.label)}</div>
        </a>
      </td></tr>`,
    )
    .join('');

  return renderCorporateEmail({title:campaign.campaign_key === 'vente' ? "Propriétaires, votre bien peut être vendu dès aujourd'hui" : campaign.hero_title, preview:campaign.preview_text || campaign.subject, category:'VOTRE PROJET IMMOBILIER', signatureHtml:signatureHtml || undefined, bodyHtml:`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${campaign.campaign_key === 'vente' ? `
      <tr><td style="background:#f3f4ed;padding:48px 0 28px;text-align:center;">
        <div style="display:inline-block;background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:8px 18px;margin-bottom:20px;">
          <span style="font-size:12px;color:#5c665e;font-weight:600;letter-spacing:0.6px;font-family:Arial,sans-serif;">🤫 Vente off-market · 100% confidentiel</span>
        </div>

        <p style="margin:0 auto 22px;max-width:480px;font-size:15px;line-height:1.6;color:#5c665e;font-family:Arial,sans-serif;">Immeuble, maison ou appartement — découvrez combien d'acheteurs qualifiés attendent un bien comme le vôtre, en toute discrétion.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 24px;">
          <tr>
            <td style="padding:0 4px;"><div style="display:inline-block;background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:7px 12px;color:#5c665e;font-size:12px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">✓ Discrétion</div></td>
            <td style="padding:0 4px;"><div style="display:inline-block;background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:7px 12px;color:#5c665e;font-size:12px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">✓ Vente rapide</div></td>
            <td style="padding:0 4px;"><div style="display:inline-block;background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:7px 12px;color:#5c665e;font-size:12px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">✓ Acheteurs qualifiés</div></td>
          </tr>
        </table>



        ${emailButton(campaign.cta_label, `${campaign.cta_url}`)}

        <p style="margin:14px auto 0;max-width:420px;font-size:12px;line-height:1.55;color:#5c665e;font-family:Arial,sans-serif;">Réponse sous 24h · 100% confidentiel · Sans engagement</p>
      </td></tr>
      ` : `
      <tr><td style="background:#ffffff;padding:48px 0 24px;text-align:center;">
        <div style="display:inline-block;background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:8px 18px;margin-bottom:24px;">
          <span style="font-size:12px;color:#5c665e;font-weight:600;letter-spacing:0.6px;font-family:Arial,sans-serif;">👑 Agence N°1 de relocation en Suisse romande • Chasseur premium</span>
        </div>

        <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#5c665e;font-weight:600;font-family:Arial,sans-serif;margin-bottom:18px;">L'immobilier accessible</div>
        <div style="height:1px;width:60px;background:#205a43;margin:0 auto 28px;opacity:0.6;"></div>

        ${campaign.preview_text ? `<p style="margin:0 auto 14px;max-width:520px;font-size:14px;line-height:1.55;color:#5c665e;font-weight:600;font-family:Arial,sans-serif;letter-spacing:0.2px;">${escapeHtml(campaign.preview_text)}</p>` : ''}
        ${campaign.hero_subtitle ? `<p style="margin:0 auto 30px;max-width:480px;font-size:16px;line-height:1.6;color:#5c665e;font-family:Arial,sans-serif;">${escapeHtml(campaign.hero_subtitle)}</p>` : '<div style="height:24px;"></div>'}


        ${emailButton(campaign.cta_label, `${campaign.cta_url}`)}

        <div style="margin:26px auto 18px;display:flex;align-items:center;justify-content:center;max-width:280px;">
          <div style="flex:1;height:1px;background:#f3f4ed;"></div>
          <div style="padding:0 14px;color:#5c665e;font-size:11px;letter-spacing:3px;font-family:Arial,sans-serif;font-weight:600;">OU</div>
          <div style="flex:1;height:1px;background:#f3f4ed;"></div>
        </div>
        ${emailButton(`📍  Fixer un RDV gratuit à nos bureaux (30 min)`, `https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=${encodeURIComponent(campaign.campaign_key)}&utm_content=cta_rdv_bureau_hero#analyse-dossier`)}
        <p style="margin:12px auto 0;max-width:420px;font-size:13px;line-height:1.55;color:#5c665e;font-family:Arial,Helvetica,sans-serif;">Un expert Logisorama vous accueille à Crissier et analyse votre dossier en direct — c'est <strong style="color:#205a43;font-style:normal;">100&nbsp;% gratuit</strong>, durée 30&nbsp;min.</p>
      </td></tr>
      `}


      ${intro ? `<tr><td style="padding:28px 0 8px;color:#5c665e;font-size:16px;line-height:1.7;font-family:Arial,sans-serif;">${intro}</td></tr>` : ''}


      <tr><td style="padding:18px 0 8px;">
        <div style="background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${benefits}</table>
        </div>
      </td></tr>


      ${campaign.trust_text ? `<tr><td style="padding:24px 0 0;text-align:center;color:#5c665e;font-size:14px;line-height:1.55;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(campaign.trust_text)}</td></tr>` : ''}


      <tr><td style="padding:34px 0 8px;text-align:center;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#5c665e;font-weight:600;margin-bottom:14px;font-family:Arial,sans-serif;">Autres parcours</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${parcoursHtml}
        </table>
      </td></tr>


      <tr><td style="padding:32px 0 16px;text-align:center;">
        ${emailButton(campaign.cta_label, `${campaign.cta_url}`)}
      </td></tr>


      <tr><td style="padding:8px 0 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;">
          <tr><td style="padding:24px 24px 22px;text-align:center;">
            <div style="font-size:22px;letter-spacing:4px;color:#5c665e;line-height:1;margin-bottom:10px;">★ ★ ★ ★ ★</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#5c665e;margin-bottom:4px;">Avis Google vérifiés</div>
            <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#5c665e;font-family:Arial,sans-serif;">Découvrez les retours authentiques de nos clients relogés</p>
            ${emailButton(`⭐ Lire nos avis Google`, `https://www.google.com/maps/place/Immo-rama.ch/@46.553728,6.572675,17z/data=!4m8!3m7!1s0x478c31710ee69131:0x868b9609d0284202!8m2!3d46.553728!4d6.572675!9m1!1b1!16s%2Fg%2F11ml0y1pmv?entry=ttu&g_ep=EgoyMDI2MDQyOC4wIKXMDSoASAFQAw%3D%3D`)}
            <div style="margin-top:14px;">
              <a href="${PUBLIC_BASE_URL}/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=${encodeURIComponent(campaign.campaign_key)}&utm_content=avis_google_site#avis" style="font-size:12px;color:#205a43;text-decoration:underline;font-family:Arial,sans-serif;">Voir tous les témoignages sur le site →</a>
            </div>
          </td></tr>
        </table>
      </td></tr>


      <tr><td style="padding:0 40px 36px;text-align:center;">
        <div style="margin:0 auto 16px;max-width:280px;height:1px;background:#f3f4ed;"></div>
        ${emailButton(`📍  Préférez un rendez-vous à nos bureaux ?`, `https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=${encodeURIComponent(campaign.campaign_key)}&utm_content=cta_rdv_bureau_final#analyse-dossier`)}
        <p style="margin:10px auto 0;max-width:380px;font-size:12px;line-height:1.5;color:#5c665e;font-family:Arial,sans-serif;">30 min avec un expert · Chemin de l'Esparsette 5, 1023 Crissier</p>
      </td></tr>




      </table>`, footerHtml:`CHE-442.303.796 · Suisse romande<br>Tu reçois cet email car tu nous as contactés via une de nos campagnes.<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#205a43;">Se désinscrire</a>`});
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
    const res = await sendTrackedEmail('https://api.resend.com/emails', {
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

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      console.error('[send-followup] auth failed', authError?.message);
      return new Response(JSON.stringify({ error: 'Non autorisé', detail: authError?.message }), {
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
      const finalSubject = subjectForCampaign(camp, fakeLead);
      const html = renderForCampaign(camp, fakeLead, 'preview-token');
      console.log('[send-followup]', { mode: 'preview', campaign_key: camp.campaign_key, finalSubject });
      return new Response(JSON.stringify({ html, subject: finalSubject }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ───── TEST
    if (mode === 'test') {
      const unsubToken = crypto.randomUUID();
      const finalSubject = `[TEST] ${subjectForCampaign(camp, fakeLead)}`;
      console.log('[send-followup]', { mode: 'test', campaign_key: camp.campaign_key, finalSubject });
      const { data: preLog } = await supabaseAdmin
        .from('lead_email_logs')
        .insert({
          lead_id: null,
          campaign_id: camp.id,
          campaign_key: camp.campaign_key,
          recipient_email: TEST_RECIPIENT,
          subject: finalSubject,
          status: 'pending',
          unsubscribe_token: unsubToken,
          test_send: true,
        })
        .select('id')
        .single();
      const logId = preLog?.id || null;
      const rawHtml = renderForCampaign(camp, fakeLead, unsubToken);
      const html = injectTracking(rawHtml, logId);
      const result = await sendViaResend(TEST_RECIPIENT, finalSubject, html);

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

      const leadSource = (body?.leadSource === 'leads' ? 'leads' : 'meta_leads') as 'leads' | 'meta_leads';

      let leads: Array<{ id: string; email: string; first_name: string | null }> = [];
      let lErr: any = null;
      if (leadSource === 'leads') {
        const res = await supabaseAdmin
          .from('leads')
          .select('id, email, prenom')
          .in('id', leadIds);
        lErr = res.error;
        leads = (res.data || []).map((l: any) => ({ id: l.id, email: l.email, first_name: l.prenom }));
      } else {
        const res = await supabaseAdmin
          .from('meta_leads')
          .select('id, email, first_name')
          .in('id', leadIds);
        lErr = res.error;
        leads = (res.data || []) as any;
      }

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
        const finalSubject = subjectForCampaign(camp, lead);
        console.log('[send-followup]', { mode: 'send', campaign_key: camp.campaign_key, lead_id: lead.id, finalSubject });

        // Pre-insert log row (status pending) to get an id we can embed in tracking links
        const { data: preLog } = await supabaseAdmin
          .from('lead_email_logs')
          .insert({
            lead_id: lead.id,
            campaign_id: camp.id,
            campaign_key: camp.campaign_key,
            recipient_email: lead.email,
            subject: finalSubject,
            status: 'pending',
            unsubscribe_token: unsubToken,
            test_send: false,
          })
          .select('id')
          .single();

        const logId = preLog?.id || null;
        const rawHtml = renderForCampaign(camp, lead, unsubToken);
        const html = injectTracking(rawHtml, logId);
        const result = await sendViaResend(lead.email, finalSubject, html, {
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
        else {
          sent++;
          if (leadSource === 'leads') {
            await supabaseAdmin.from('leads').update({ contacted: true }).eq('id', lead.id);
          }
        }

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
