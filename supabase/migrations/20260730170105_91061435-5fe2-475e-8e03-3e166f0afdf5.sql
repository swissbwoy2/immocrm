CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON public.calendar_events (event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_agent_date ON public.calendar_events (agent_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_date ON public.calendar_events (client_id, event_date);
CREATE INDEX IF NOT EXISTS idx_visites_date_visite ON public.visites (date_visite);
CREATE INDEX IF NOT EXISTS idx_visites_agent_date ON public.visites (agent_id, date_visite);
CREATE INDEX IF NOT EXISTS idx_visites_client_date ON public.visites (client_id, date_visite);
CREATE INDEX IF NOT EXISTS idx_lead_phone_appointments_slot_start ON public.lead_phone_appointments (slot_start);