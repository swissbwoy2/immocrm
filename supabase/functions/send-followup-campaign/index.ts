import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
function normalizeFrom(raw: string | undefined): string {
  const fallback = 'Logisorama <noreply@notify.logisorama.ch>';
  if (!raw) return fallback;
  const v = raw.trim();
  // Already in "Name <email>" format
  if (/^.+<[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>$/.test(v)) return v;
  // Bare email
  if (/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(v)) return `Logisorama <${v}>`;
  // Looks like a bare domain → build address from it
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) return `Logisorama <noreply@${v}>`;
  return fallback;
}
const RESEND_FROM_EMAIL = normalizeFrom(Deno.env.get('RESEND_FROM_EMAIL'));
const TEST_RECIPIENT = 'info@immo-rama.ch';
const PUBLIC_BASE_URL = 'https://logisorama.ch';
const MAX_LEADS_PER_INVOCATION = 500;
const SEND_DELAY_MS = 200;

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

function renderEmail(campaign: Campaign, lead: LeadData, unsubscribeToken: string): string {
  const firstName = lead.first_name?.trim() || 'cher futur client';
  const intro = (campaign.body_intro || '').replace(/\{\{first_name\}\}/g, escapeHtml(firstName));
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

        <!-- 2e CTA — Appel téléphonique gratuit -->
        <a href="https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=${encodeURIComponent(campaign.campaign_key)}&utm_content=cta_appel_tel#analyse-dossier" style="display:inline-block;background:transparent;border:2px solid #b8893d;color:#d4a857;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;line-height:1.3;">📞  Réservez votre appel téléphonique gratuit (15 min)</a>
        <p style="margin:12px auto 0;max-width:420px;font-size:13px;line-height:1.55;color:#a89b82;font-style:italic;font-family:Georgia,serif;">Un expert Logisorama vous appelle au numéro de votre choix et analyse votre dossier en direct — c'est <strong style="color:#d4a857;font-style:normal;">100&nbsp;% gratuit</strong>.</p>
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

      <!-- CTA FINAL — Appel téléphonique -->
      <tr><td style="padding:0 40px 36px;text-align:center;">
        <div style="margin:0 auto 16px;max-width:280px;height:1px;background:rgba(184,137,61,0.25);"></div>
        <a href="https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=${encodeURIComponent(campaign.campaign_key)}&utm_content=cta_appel_tel_final#analyse-dossier" style="display:inline-block;background:transparent;border:2px solid #b8893d;color:#d4a857;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;font-family:Arial,sans-serif;letter-spacing:0.3px;">📞  Préférez un appel téléphonique gratuit&nbsp;?</a>
        <p style="margin:10px auto 0;max-width:380px;font-size:12px;line-height:1.5;color:#8a7f6e;font-family:Arial,sans-serif;">15 min avec un expert · analyse en direct de votre dossier</p>
      </td></tr>

      <!-- SIGNATURE -->
      ${signatureHtml ? `<tr><td style="padding:0 40px 32px;color:#c9bfac;font-size:14px;line-height:1.7;font-family:Georgia,serif;font-style:italic;">${signatureHtml}</td></tr>` : ''}

      <!-- FOOTER -->
      <tr><td style="background:#0e0c0a;padding:26px 32px;text-align:center;border-top:1px solid rgba(184,137,61,0.15);">
        <div style="font-family:Georgia,serif;font-size:18px;color:#d4a857;font-weight:700;letter-spacing:0.5px;margin-bottom:4px;">Logisorama<span style="color:#f4ecd8;">.ch</span></div>
        <div style="color:#8a7f6e;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">
          by <strong style="color:#c9a96a;">Immo-Rama Sàrl</strong> &middot; CHE-442.303.796<br>
          Suisse romande &middot; <a href="${PUBLIC_BASE_URL}" style="color:#d4a857;text-decoration:none;">logisorama.ch</a>
        </div>
        <div style="margin-top:16px;color:#5a5246;font-size:11px;font-family:Arial,sans-serif;">
          Vous recevez cet email car vous nous avez contactés via une de nos campagnes.<br>
          <a href="${unsubscribeUrl}" style="color:#8a7f6e;text-decoration:underline;">Se désinscrire</a>
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, html }),
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
    const fakeLead: LeadData = { first_name: 'Marie', email: TEST_RECIPIENT };

    // ───── PREVIEW
    if (mode === 'preview') {
      const html = renderEmail(camp, fakeLead, 'preview-token');
      return new Response(JSON.stringify({ html, subject: camp.subject }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ───── TEST
    if (mode === 'test') {
      const unsubToken = crypto.randomUUID();
      const html = renderEmail(camp, fakeLead, unsubToken);
      const result = await sendViaResend(TEST_RECIPIENT, `[TEST] ${camp.subject}`, html);

      await supabaseAdmin.from('lead_email_logs').insert({
        lead_id: null,
        campaign_id: camp.id,
        campaign_key: camp.campaign_key,
        recipient_email: TEST_RECIPIENT,
        subject: `[TEST] ${camp.subject}`,
        status: result.error ? 'failed' : 'sent',
        sent_at: result.error ? null : new Date().toISOString(),
        error_message: result.error || null,
        provider_message_id: result.id || null,
        unsubscribe_token: unsubToken,
        test_send: true,
      });

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

      // Already-sent lookup
      const { data: alreadySent } = await supabaseAdmin
        .from('lead_email_logs')
        .select('lead_id')
        .eq('campaign_id', camp.id)
        .eq('status', 'sent')
        .eq('test_send', false)
        .in('lead_id', leadIds);
      const sentSet = new Set((alreadySent || []).map((r: any) => r.lead_id));

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
        const html = renderEmail(camp, lead, unsubToken);
        const result = await sendViaResend(lead.email, camp.subject, html);

        await supabaseAdmin.from('lead_email_logs').insert({
          lead_id: lead.id,
          campaign_id: camp.id,
          campaign_key: camp.campaign_key,
          recipient_email: lead.email,
          subject: camp.subject,
          status: result.error ? 'failed' : 'sent',
          sent_at: result.error ? null : new Date().toISOString(),
          error_message: result.error || null,
          provider_message_id: result.id || null,
          unsubscribe_token: unsubToken,
          test_send: false,
        });

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
