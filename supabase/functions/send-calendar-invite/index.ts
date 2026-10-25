import { trackedResendFetch } from "../_shared/tracked-resend.ts";
const sendTrackedEmail = trackedResendFetch("send-calendar-invite");
import { renderCorporateEmail, emailDetails, emailParagraph, escapeEmailHtml } from '../_shared/email-shell.ts';
import { formatDateFR, formatTimeFR, toZurichISODate } from '../_shared/date-fr.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatDateToICS(date: Date, allDay?: boolean): string {
  if (allDay) {
    // Jour calendaire en Europe/Zurich (pas en UTC : un minuit suisse = 23:00Z la veille)
    return (toZurichISODate(date) ?? date.toISOString().slice(0, 10)).replace(/-/g, '');
  }
  // UTC « Z » : chaque calendrier convertit dans le fuseau de l'utilisateur
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Jour (YYYYMMDD) d'une valeur all-day : chaîne date seule prise telle quelle. */
function icsDay(value: string, offsetDays = 0): string {
  const iso = toZurichISODate(value) ?? new Date(value).toISOString().slice(0, 10);
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/** RFC 5545 §3.1 : lignes de 75 octets max, continuation par CRLF + espace. */
function foldICSLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/** base64 UTF-8 (btoa seul casse sur « — », « ’ »… et encode « é » en Latin-1). */
function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function generateICS(event: {
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
}): string {
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@immocrm`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ImmoCRM//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateToICS(new Date())}`,
  ];

  if (event.all_day) {
    lines.push(`DTSTART;VALUE=DATE:${icsDay(event.start_date)}`);
    lines.push(`DTEND;VALUE=DATE:${icsDay(event.end_date || event.start_date, 1)}`);
  } else {
    lines.push(`DTSTART:${formatDateToICS(start)}`);
    lines.push(`DTEND:${formatDateToICS(end)}`);
  }

  lines.push(`SUMMARY:${escapeICS(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
  lines.push('STATUS:CONFIRMED');
  lines.push('BEGIN:VALARM');
  lines.push('TRIGGER:-PT30M');
  lines.push('ACTION:DISPLAY');
  lines.push(`DESCRIPTION:${escapeICS(event.title)}`);
  lines.push('END:VALARM');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.map(foldICSLine).join('\r\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, location, start_date, end_date, all_day, recipient_email } = await req.json();

    if (!title || !start_date || !recipient_email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = 'Logisorama <support@logisorama.ch>';

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const icsContent = generateICS({
      title,
      description: description || '',
      location: location || '',
      start_date,
      end_date: end_date || new Date(new Date(start_date).getTime() + 3600000).toISOString(),
      all_day: all_day || false,
    });

    // Encode ICS content to base64
    const icsBase64 = utf8ToBase64(icsContent);

    const endValue = end_date || new Date(new Date(start_date).getTime() + 3600000).toISOString();
    const dateStr = formatDateFR(start_date, { weekday: true });
    const timeStr = all_day
      ? 'Journée entière'
      : `${formatTimeFR(start_date)} – ${formatTimeFR(endValue)} (Heure de Zurich)`;

    const htmlBody = renderCorporateEmail({
      title: 'Invitation calendrier',
      preview: `${title} — ${dateStr}`,
      category: "VOTRE RENDEZ-VOUS",
      bodyHtml:
        `<p style="margin:0 0 14px;font-size:18px;line-height:26px;font-weight:600;color:#15261d;">${escapeEmailHtml(title)}</p>` +
        emailDetails([
          ['Date', dateStr],
          ['Heure', timeStr],
          ...(location ? [['Lieu', location] as [string, unknown]] : []),
          ...(description
            ? [{ label: 'Détails', html: escapeEmailHtml(description).replace(/\r?\n/g, '<br>') }]
            : []),
        ]) +
        emailParagraph('Ouvrez le fichier joint pour ajouter cet événement à votre calendrier.', true),
    });

    const res = await sendTrackedEmail('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipient_email],
        subject: `📅 ${title}`,
        html: htmlBody,
        attachments: [
          {
            filename: 'invitation.ics',
            content: icsBase64,
            content_type: 'text/calendar; method=REQUEST',
          },
        ],
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('Resend error:', resData);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: resData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: resData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
