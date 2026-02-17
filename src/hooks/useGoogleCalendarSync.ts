import { supabase } from '@/integrations/supabase/client';

interface CalendarEventPayload {
  title: string;
  description?: string;
  start: string; // ISO 8601 or YYYY-MM-DD
  end?: string;
  allDay?: boolean;
  location?: string;
}

/**
 * Hook to sync an event to a user's Google Calendar.
 * Silently skips if the user hasn't connected Google Calendar.
 */
export function useGoogleCalendarSync() {
  const syncEvent = async (userId: string, event: CalendarEventPayload) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const baseUrl = supabaseUrl || `https://${projectId}.supabase.co`;

      const response = await fetch(`${baseUrl}/functions/v1/sync-google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ userId, ...event }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.skipped) return; // User not connected, silent skip
        console.warn('Google Calendar sync failed:', data);
      }
    } catch (error) {
      // Silent fail - Google Calendar sync is non-critical
      console.warn('Google Calendar sync error (non-critical):', error);
    }
  };

  return { syncEvent };
}
