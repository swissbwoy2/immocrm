// Multi-tier reminders for office phone appointments: 24h, 3h, 1h, 30min
// Email + WhatsApp. Idempotent via per-tier *_sent_at columns. Run every 5 min.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TierKey = '24h' | '3h' | '1h' | '30m';

interface Tier {
  key: TierKey;
  // Window in minutes from now for slot_start
  fromMin: number;
  toMin: number;
  emailCol: string;
  waCol: string;
  subjectFr: (dateStr: string, timeStr: string) => string;
  emailIntro: string;
  waHoraire: (timeStr: string) => string;
}

const TIERS: Tier[] = [
  {
    key: '24h',
    fromMin: 23 * 60,
    toMin: 25 * 60,
    emailCol: 'reminder_24h_sent_at',
    waCol: 'wa_reminder_24h_sent_at',
    subjectFr: (d, t) => `📍 Rappel : votre RDV demain — ${d} à ${t}`,
    emailIntro: 'Petit rappel : nous vous accueillons <strong>demain</strong> à notre bureau.',
    waHoraire: (t) => `demain à ${t}`,
  },
  {
    key: '3h',
    fromMin: 2 * 60 + 50,
    toMin: 3 * 60 + 10,
    emailCol: 'reminder_3h_sent_at',
    waCol: 'wa_reminder_3h_sent_at',
    subjectFr: (_d, t) => `⏰ Rappel : votre RDV dans 3 heures à ${t}`,
    emailIntro: 'Petit rappel : votre rendez-vous au bureau est <strong>dans environ 3 heures</strong>.',
    waHoraire: (t) => `dans environ 3 heures (${t})`,
  },
  {
    key: '1h',
    fromMin: 50,
    toMin: 70,
    emailCol: 'reminder_1h_sent_at',
    waCol: 'wa_reminder_1h_sent_at',
    subjectFr: (_d, t) => `⏰ Votre RDV dans 1 heure à ${t}`,
    emailIntro: 'Votre rendez-vous au bureau est <strong>dans 1 heure</strong>. Merci d\'arriver 5 minutes en avance.',
    waHoraire: (t) => `dans 1 heure (${t})`,
  },
  {
    key: '30m',
    fromMin: 25,
    toMin: 35,
    emailCol: 'reminder_30m_sent_at',
    waCol: 'wa_reminder_30m_sent_at',
    subjectFr: (_d, t) => `🚨 Votre RDV dans 30 minutes à ${t}`,
    emailIntro: 'Votre rendez-vous au bureau est <strong>dans 30 minutes</strong>. À tout de suite !',
    waHoraire: (t) => `dans 30 minutes (${t})`,
  },
];

const OFFICE_ADDRESS = "Chemin de l'Esparsette 5, 1023 Crissier";

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = String(raw).replace(/[^\d+]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (!p.startsWith('+')) p = p.startsWith('0') ? '+41' + p.slice(1) : '+' + p;
  if (!/^\+\d{8,15}$/.test(p)) return null;
  return p;
}

function buildEmailHtml(prospectName: string, dateStr: string, timeStr: string, intro: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f7;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; color: white; margin-bottom: 20px;">
        <div style="font-size: 13px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Rappel RDV</div>
        <h1 style="margin: 0 0 10px 0; font-size: 24px;">📍 Rendez-vous au bureau</h1>
        <p style="margin: 0; opacity: 0.85;">Bonjour ${prospectName},</p>
      </div>
      <div style="background: white; border-radius: 16px; padding: 28px;">
        <p style="margin: 0 0 18px 0; font-size: 16px; color: #333;">${intro}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #777; width: 110px;">📆 Date</td><td style="padding: 8px 0; font-weight: 600;">${dateStr}</td></tr>
          <tr><td style="padding: 8px 0; color: #777;">🕐 Heure</td><td style="padding: 8px 0; font-weight: 600;">${timeStr}</td></tr>
          <tr><td style="padding: 8px 0; color: #777; vertical-align: top;">📍 Adresse</td><td style="padding: 8px 0; font-weight: 600;">${OFFICE_ADDRESS}</td></tr>
        </table>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
        Logisorama by Immo-Rama · support@logisorama.ch
      </p>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const summary: Record<string, { candidates: number; email_sent: number; wa_sent: number; errors: number }> = {};
    const now = Date.now();

    for (const tier of TIERS) {
      const lower = new Date(now + tier.fromMin * 60_000).toISOString();
      const upper = new Date(now + tier.toMin * 60_000).toISOString();

      const { data: appts, error } = await admin
        .from('lead_phone_appointments')
        .select('*')
        .eq('status', 'confirme')
        .gte('slot_start', lower)
        .lte('slot_start', upper);

      if (error) {
        console.error(`[reminder ${tier.key}] fetch error`, error);
        summary[tier.key] = { candidates: 0, email_sent: 0, wa_sent: 0, errors: 1 };
        continue;
      }

      let emailSent = 0, waSent = 0, errors = 0;
      for (const appt of appts || []) {
        const start = new Date(appt.slot_start);
        const dateStr = start.toLocaleDateString('fr-CH', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich',
        });
        const timeStr = start.toLocaleTimeString('fr-CH', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich',
        });
        const firstName = (appt.prospect_name || 'à toi').split(' ')[0];

        // EMAIL
        if (RESEND_API_KEY && !appt[tier.emailCol] && appt.prospect_email) {
          try {
            const html = buildEmailHtml(appt.prospect_name || '', dateStr, timeStr, tier.emailIntro);
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Logisorama <support@logisorama.ch>',
                to: [appt.prospect_email],
                subject: tier.subjectFr(dateStr, timeStr),
                html,
              }),
            });
            if (res.ok) {
              await admin.from('lead_phone_appointments')
                .update({ [tier.emailCol]: new Date().toISOString() })
                .eq('id', appt.id);
              emailSent++;
            } else {
              errors++;
              console.error(`[reminder ${tier.key}] resend error`, appt.id, await res.text());
            }
          } catch (e) {
            errors++;
            console.error(`[reminder ${tier.key}] email exception`, appt.id, e);
          }
        }

        // WHATSAPP
        if (!appt[tier.waCol]) {
          const phone = normalizePhone(appt.prospect_phone);
          if (phone) {
            try {
              const r = await admin.functions.invoke('send-whatsapp-notification', {
                body: {
                  event_type: `phone_appointment_reminder_${tier.key}`,
                  template_key: 'rdv_bureau_rappel',
                  recipient_phone_override: phone,
                  variables: [firstName, tier.waHoraire(timeStr)],
                  context_type: 'phone_appointment',
                  context_ref: appt.id,
                },
              });
              if (!r.error) {
                await admin.from('lead_phone_appointments')
                  .update({ [tier.waCol]: new Date().toISOString() })
                  .eq('id', appt.id);
                waSent++;
              } else {
                errors++;
                console.error(`[reminder ${tier.key}] wa error`, appt.id, r.error);
              }
            } catch (e) {
              errors++;
              console.error(`[reminder ${tier.key}] wa exception`, appt.id, e);
            }
          }
        }
      }

      summary[tier.key] = { candidates: appts?.length ?? 0, email_sent: emailSent, wa_sent: waSent, errors };
    }

    console.log('[phone-appointment-reminders]', JSON.stringify(summary));
    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[phone-appointment-reminders] fatal', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
