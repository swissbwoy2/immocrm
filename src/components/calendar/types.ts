export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  status?: string;
  priority?: string;
  agent_id?: string;
  client_id?: string;
  description?: string;
  all_day?: boolean;
  end_date?: string;
}
