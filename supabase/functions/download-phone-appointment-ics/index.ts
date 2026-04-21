import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pad(n: number) { return String(n).padStart(2, '0'); }
function toICSDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function escapeICS(s: string) {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id || !UUID_RE.test(id)) {
      return new Response('Invalid id', { status: 400, headers: corsHeaders });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: appt, error } = await admin
      .from('lead_phone_appointments')
      .select('id, prospect_name, prospect_phone, slot_start, slot_end, status')
      .eq('id', id)
      .single();

    if (error || !appt) {
      return new Response('Appointment not found', { status: 404, headers: corsHeaders });
    }

    const start = new Date(appt.slot_start);
    const end = new Date(appt.slot_end);
    const uid = `phone-appt-${appt.id}@logisorama.ch`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Logisorama//Phone Appointment//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${escapeICS('Rendez-vous téléphonique avec Logisorama')}`,
      `DESCRIPTION:${escapeICS(`Notre équipe vous appellera au ${appt.prospect_phone}. Merci d'être disponible à l'heure prévue.`)}`,
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

    return new Response(ics, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rdv-logisorama.ics"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('download-phone-appointment-ics error:', e);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
