import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CalendarEventPayload {
  userId: string;
  title: string;
  description?: string;
  start: string; // ISO 8601
  end?: string;  // ISO 8601
  allDay?: boolean;
  location?: string;
}

async function getValidAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{ accessToken: string; expiresAt: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  return { accessToken: data.access_token, expiresAt };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Google Calendar not configured', skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CalendarEventPayload = await req.json();
    const { userId, title, description, start, end, allDay, location } = body;

    if (!userId || !title || !start) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, title, start' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user's token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenRow) {
      // User hasn't connected Google Calendar - silently skip
      return new Response(JSON.stringify({ skipped: true, reason: 'User not connected to Google Calendar' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if access token is expired and refresh if needed
    let accessToken = tokenRow.access_token;
    const now = new Date();
    const expiresAt = tokenRow.token_expires_at ? new Date(tokenRow.token_expires_at) : null;

    if (!accessToken || !expiresAt || expiresAt <= now) {
      const refreshed = await getValidAccessToken(tokenRow.refresh_token, clientId, clientSecret);
      accessToken = refreshed.accessToken;

      // Update token in DB
      await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: refreshed.accessToken,
          token_expires_at: refreshed.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // Build Google Calendar event
    let googleEvent: Record<string, unknown>;

    if (allDay) {
      // All-day event: use date format (YYYY-MM-DD)
      const dateOnly = start.split('T')[0];
      const endDateOnly = end ? end.split('T')[0] : dateOnly;

      googleEvent = {
        summary: title,
        description: description || undefined,
        location: location || undefined,
        start: { date: dateOnly },
        end: { date: endDateOnly },
      };
    } else {
      // Timed event: use dateTime format
      const endTime = end || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();

      googleEvent = {
        summary: title,
        description: description || undefined,
        location: location || undefined,
        start: { dateTime: start, timeZone: 'Europe/Zurich' },
        end: { dateTime: endTime, timeZone: 'Europe/Zurich' },
      };
    }

    // Create event in Google Calendar
    const calendarId = tokenRow.calendar_id || 'primary';
    const gcalResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    const gcalData = await gcalResponse.json();

    if (!gcalResponse.ok) {
      console.error('Google Calendar API error:', gcalData);
      return new Response(JSON.stringify({ error: 'Failed to create Google Calendar event', details: gcalData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, eventId: gcalData.id, htmlLink: gcalData.htmlLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in sync-google-calendar:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
