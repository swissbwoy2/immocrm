import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function toICSDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function escapeICS(s: string) {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function buildICS(appt: any) {
  const start = new Date(appt.slot_start);
  const end = new Date(appt.slot_end);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Logisorama//Phone Appointment//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:phone-appt-${appt.id}@logisorama.ch`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICS('Rendez-vous téléphonique avec Logisorama')}`,
    `DESCRIPTION:${escapeICS(`Notre équipe vous appellera au ${appt.prospect_phone}.`)}`,
    `LOCATION:${escapeICS(`Téléphone : ${appt.prospect_phone}`)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS('Rappel RDV Logisorama dans 15 minutes')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      console.error('[reminder] RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const now = new Date();
    const lower = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const upper = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    const { data: appts, error: fetchErr } = await admin
      .from('lead_phone_appointments')
      .select('*')
      .eq('status', 'confirme')
      .is('reminder_24h_sent_at', null)
      .gte('slot_start', lower)
      .lte('slot_start', upper);

    if (fetchErr) throw fetchErr;

    let sent = 0, skipped = 0, errors = 0;
    const downloadBase = `${SUPABASE_URL}/functions/v1/download-phone-appointment-ics`;

    for (const appt of appts || []) {
      try {
        const start = new Date(appt.slot_start);
        const dateStr = start.toLocaleDateString('fr-CH', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          timeZone: 'Europe/Zurich',
        });
        const timeStr = start.toLocaleTimeString('fr-CH', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich',
        });

        const icsContent = buildICS(appt);
        const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)));
        const calendarUrl = `${downloadBase}?id=${appt.id}`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f7;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 36px; color: white; margin-bottom: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);">
              <div style="font-size: 14px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Rappel</div>
              <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700;">📞 Votre RDV téléphonique demain</h1>
              <p style="margin: 0; opacity: 0.85; font-size: 16px;">Bonjour ${appt.prospect_name},</p>
            </div>
            <div style="background: white; border-radius: 16px; padding: 28px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Petit rappel amical : notre équipe vous appellera <strong>demain</strong> au numéro indiqué.
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr><td style="padding: 10px 0; color: #777; width: 110px;">📆 Date</td><td style="padding: 10px 0; font-weight: 600; color: #1a1a2e;">${dateStr}</td></tr>
                <tr><td style="padding: 10px 0; color: #777;">🕐 Heure</td><td style="padding: 10px 0; font-weight: 600; color: #1a1a2e;">${timeStr}</td></tr>
                <tr><td style="padding: 10px 0; color: #777;">⏱️ Durée</td><td style="padding: 10px 0; font-weight: 600; color: #1a1a2e;">15 minutes</td></tr>
                <tr><td style="padding: 10px 0; color: #777;">📞 Numéro</td><td style="padding: 10px 0; font-weight: 600; color: #1a1a2e;">${appt.prospect_phone}</td></tr>
              </table>
              <div style="text-align: center; margin-top: 28px;">
                <a href="${calendarUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #c9a961 0%, #b8973f 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(201,169,97,0.35);">
                  📅 Ajouter au calendrier
                </a>
              </div>
              <p style="color: #999; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
                Le fichier d'invitation est aussi joint à cet email.
              </p>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
              Logisorama by Immo-Rama · support@logisorama.ch
            </p>
          </div>
        `;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Logisorama <support@logisorama.ch>',
            to: [appt.prospect_email],
            subject: `📞 Rappel : votre rendez-vous téléphonique demain — ${dateStr} à ${timeStr}`,
            html,
            attachments: [
              {
                filename: 'rdv-logisorama.ics',
                content: icsBase64,
                content_type: 'text/calendar; method=REQUEST',
              },
            ],
          }),
        });

        if (!res.ok) {
          errors++;
          console.error('[reminder] Resend error', appt.id, await res.text());
          continue;
        }

        await admin
          .from('lead_phone_appointments')
          .update({ reminder_24h_sent_at: new Date().toISOString() })
          .eq('id', appt.id);

        sent++;
      } catch (e) {
        errors++;
        console.error('[reminder] error for', appt.id, e);
      }
    }

    console.log(`[reminder] sent=${sent}, skipped=${skipped}, errors=${errors}, candidates=${appts?.length ?? 0}`);

    return new Response(JSON.stringify({ success: true, sent, skipped, errors, candidates: appts?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[reminder] fatal', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
