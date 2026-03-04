/**
 * ICS Calendar File Generator (RFC 5545)
 * Generates .ics files compatible with:
 * - iPhone Calendar (native)
 * - Google Calendar
 * - Outlook
 * - Any iCalendar-compatible app
 */

export interface ICSEventData {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  uid?: string;
}

function formatDateToICS(date: Date, allDay?: boolean): string {
  if (allDay) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@immocrm`;
}

export function generateICSContent(event: ICSEventData): string {
  const { title, description, location, startDate, endDate, allDay } = event;
  
  const end = endDate || new Date(startDate.getTime() + 60 * 60 * 1000); // default 1h

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ImmoCRM//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid || generateUID()}`,
    `DTSTAMP:${formatDateToICS(new Date())}`,
  ];

  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateToICS(startDate, true)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateToICS(new Date(end.getTime() + 86400000), true)}`);
  } else {
    lines.push(`DTSTART:${formatDateToICS(startDate)}`);
    lines.push(`DTEND:${formatDateToICS(end)}`);
  }

  lines.push(`SUMMARY:${escapeICSText(title)}`);
  
  if (description) {
    lines.push(`DESCRIPTION:${escapeICSText(description)}`);
  }
  if (location) {
    lines.push(`LOCATION:${escapeICSText(location)}`);
  }

  lines.push('STATUS:CONFIRMED');
  lines.push('BEGIN:VALARM');
  lines.push('TRIGGER:-PT30M');
  lines.push('ACTION:DISPLAY');
  lines.push(`DESCRIPTION:${escapeICSText(title)}`);
  lines.push('END:VALARM');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

export function downloadICSFile(event: ICSEventData, filename?: string): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Generate a single .ics file containing multiple events
 */
export function generateMultiEventICSContent(events: ICSEventData[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ImmoCRM//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const { title, description, location, startDate, endDate, allDay } = event;
    const end = endDate || new Date(startDate.getTime() + 60 * 60 * 1000);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid || generateUID()}`);
    lines.push(`DTSTAMP:${formatDateToICS(new Date())}`);

    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateToICS(startDate, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateToICS(new Date(end.getTime() + 86400000), true)}`);
    } else {
      lines.push(`DTSTART:${formatDateToICS(startDate)}`);
      lines.push(`DTEND:${formatDateToICS(end)}`);
    }

    lines.push(`SUMMARY:${escapeICSText(title)}`);
    if (description) lines.push(`DESCRIPTION:${escapeICSText(description)}`);
    if (location) lines.push(`LOCATION:${escapeICSText(location)}`);

    lines.push('STATUS:CONFIRMED');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT30M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeICSText(title)}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Download a multi-event .ics file
 */
export function downloadMultiEventICSFile(events: ICSEventData[], filename: string): void {
  if (events.length === 0) return;
  const content = generateMultiEventICSContent(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Send calendar invite via edge function (email with .ics attachment)
 */
export interface VisiteICSDescriptionData {
  clients?: string;
  agent?: string;
  adresse?: string;
  prix?: string;
  pieces?: number | string;
  surface?: number | string;
  etage?: number | string;
  notes?: string;
  lien_annonce?: string;
  description?: string;
}

export function buildVisiteICSDescription(data: VisiteICSDescriptionData): string {
  const lines: string[] = [];
  if (data.clients) lines.push(`👤 Client(s): ${data.clients}`);
  if (data.agent) lines.push(`👨‍💼 Agent: ${data.agent}`);
  if (data.adresse) lines.push(`📍 ${data.adresse}`);
  if (data.prix) lines.push(`💰 Prix: ${data.prix}`);

  const specs: string[] = [];
  if (data.pieces) specs.push(`${data.pieces} pièces`);
  if (data.surface) specs.push(`${data.surface}m²`);
  if (data.etage) specs.push(`${data.etage}e étage`);
  if (specs.length) lines.push(`🏠 ${specs.join(' • ')}`);

  if (data.notes) lines.push(`📝 Notes: ${data.notes}`);
  if (data.lien_annonce) lines.push(`🔗 Annonce: ${data.lien_annonce}`);
  if (data.description) lines.push(`📄 ${data.description.substring(0, 200)}${data.description.length > 200 ? '...' : ''}`);
  return lines.join('\n');
}

export async function sendCalendarInvite(
  event: ICSEventData,
  recipientEmail: string,
  supabaseInvoke: (name: string, options: any) => Promise<any>
): Promise<boolean> {
  try {
    const { error } = await supabaseInvoke('send-calendar-invite', {
      body: {
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start_date: event.startDate.toISOString(),
        end_date: (event.endDate || new Date(event.startDate.getTime() + 3600000)).toISOString(),
        all_day: event.allDay || false,
        recipient_email: recipientEmail,
      },
    });
    return !error;
  } catch {
    console.error('Failed to send calendar invite');
    return false;
  }
}
