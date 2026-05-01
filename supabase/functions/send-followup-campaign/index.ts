import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Logisorama <noreply@notify.logisorama.ch>';
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
          <div style="width:22px;height:22px;border-radius:50%;background:#d4a857;color:#0a0e1a;font-weight:700;font-size:13px;text-align:center;line-height:22px;">✓</div>
        </td>
        <td style="padding:10px 0 10px 12px;color:#1e3a5f;font-size:15px;line-height:1.5;font-family:Arial,sans-serif;">${escapeHtml(b)}</td>
      </tr>`,
    )
    .join('');

  const signatureHtml = (campaign.signature || '').split('\n').map((l) => escapeHtml(l)).join('<br>');
  const unsubscribeUrl = `${PUBLIC_BASE_URL}/unsubscribe/${unsubscribeToken}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(campaign.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(campaign.preview_text || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1ea;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(10,14,26,0.12);">

      <!-- HEADER -->
      <tr><td style="background:#0a0e1a;padding:24px 32px;text-align:left;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:middle;">
              <div style="font-size:22px;font-weight:700;color:#d4a857;letter-spacing:0.5px;font-family:Georgia,serif;">Logisorama<span style="color:#ffffff;">.ch</span></div>
              <div style="font-size:11px;color:#8b9bb4;margin-top:2px;letter-spacing:1px;text-transform:uppercase;">by Immo-Rama Sàrl</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- HERO -->
      <tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#0a0e1a 100%);padding:48px 32px 40px;text-align:center;">
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:#d4a857;font-weight:700;font-family:Georgia,serif;">${escapeHtml(campaign.hero_title)}</h1>
        ${campaign.hero_subtitle ? `<p style="margin:0 0 28px;font-size:16px;line-height:1.55;color:#d8e0ec;font-family:Arial,sans-serif;">${escapeHtml(campaign.hero_subtitle)}</p>` : ''}
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${campaign.cta_url}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="23%" stroke="f" fillcolor="#d4a857">
          <w:anchorlock/>
          <center style="color:#0a0e1a;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(campaign.cta_label)}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${campaign.cta_url}" style="display:inline-block;background:#d4a857;color:#0a0e1a;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:12px;font-family:Arial,sans-serif;letter-spacing:0.3px;">${escapeHtml(campaign.cta_label)}</a>
        <!--<![endif]-->
      </td></tr>

      <!-- INTRO -->
      ${intro ? `<tr><td style="padding:36px 40px 12px;color:#1e3a5f;font-size:16px;line-height:1.6;font-family:Arial,sans-serif;">${intro}</td></tr>` : ''}

      <!-- BENEFITS -->
      <tr><td style="padding:20px 40px 8px;">
        <div style="background:#f9f7f1;border-radius:12px;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${benefits}</table>
        </div>
      </td></tr>

      <!-- TRUST -->
      ${campaign.trust_text ? `<tr><td style="padding:24px 40px 8px;text-align:center;color:#5a7090;font-size:14px;line-height:1.5;font-style:italic;font-family:Arial,sans-serif;">${escapeHtml(campaign.trust_text)}</td></tr>` : ''}

      <!-- CTA FINAL -->
      <tr><td style="padding:32px 40px 40px;text-align:center;">
        <a href="${campaign.cta_url}" style="display:inline-block;background:#d4a857;color:#0a0e1a;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:12px;font-family:Arial,sans-serif;letter-spacing:0.3px;">${escapeHtml(campaign.cta_label)}</a>
      </td></tr>

      <!-- SIGNATURE -->
      ${signatureHtml ? `<tr><td style="padding:0 40px 32px;color:#1e3a5f;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">${signatureHtml}</td></tr>` : ''}

      <!-- FOOTER -->
      <tr><td style="background:#0a0e1a;padding:24px 32px;text-align:center;">
        <div style="color:#8b9bb4;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
          <strong style="color:#d4a857;">Immo-Rama Sàrl</strong> &middot; CHE-442.303.796<br>
          Suisse romande &middot; <a href="${PUBLIC_BASE_URL}" style="color:#d4a857;text-decoration:none;">logisorama.ch</a>
        </div>
        <div style="margin-top:14px;color:#5a7090;font-size:11px;font-family:Arial,sans-serif;">
          Vous recevez cet email car vous nous avez contactés via une de nos campagnes.<br>
          <a href="${unsubscribeUrl}" style="color:#8b9bb4;text-decoration:underline;">Se désinscrire</a>
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
