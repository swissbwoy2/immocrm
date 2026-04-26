import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatDateToICS(date: Date, allDay?: boolean): string {
  if (allDay) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
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
    lines.push(`DTSTART;VALUE=DATE:${formatDateToICS(start, true)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateToICS(new Date(end.getTime() + 86400000), true)}`);
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

  return lines.join('\r\n');
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
    const icsBase64 = btoa(icsContent);

    const startDate = new Date(start_date);
    const dateStr = startDate.toLocaleDateString('fr-CH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = all_day ? 'Journée entière' : startDate.toLocaleTimeString('fr-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 30px; color: white; margin-bottom: 20px;">
          <h1 style="margin: 0 0 10px 0; font-size: 24px;">📅 Invitation calendrier</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 16px;">${title}</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 100px;">📆 Date</td>
              <td style="padding: 8px 0; font-weight: 600;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">🕐 Heure</td>
              <td style="padding: 8px 0; font-weight: 600;">${timeStr}</td>
            </tr>
            ${location ? `<tr><td style="padding: 8px 0; color: #666;">📍 Lieu</td><td style="padding: 8px 0; font-weight: 600;">${location}</td></tr>` : ''}
            ${description ? `<tr><td style="padding: 8px 0; color: #666;">📝 Détails</td><td style="padding: 8px 0;">${description}</td></tr>` : ''}
          </table>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center;">
          Ouvrez le fichier joint pour ajouter cet événement à votre calendrier.
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
