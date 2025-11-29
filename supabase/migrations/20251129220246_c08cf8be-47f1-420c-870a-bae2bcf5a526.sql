-- Create calendar_events table for storing all types of events
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('rappel', 'rendez_vous', 'tache', 'reunion', 'autre')),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'planifie' CHECK (status IN ('planifie', 'effectue', 'annule')),
  priority TEXT DEFAULT 'normale' CHECK (priority IN ('basse', 'normale', 'haute', 'urgente')),
  all_day BOOLEAN DEFAULT false,
  reminder_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all calendar events"
ON public.calendar_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view their calendar events"
ON public.calendar_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = calendar_events.agent_id
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Agents can insert their own calendar events"
ON public.calendar_events
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    agent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = calendar_events.agent_id
      AND agents.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Agents can update their own calendar events"
ON public.calendar_events
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Agents can delete their own calendar events"
ON public.calendar_events
FOR DELETE
USING (auth.uid() = created_by);

CREATE POLICY "Clients can view their calendar events"
ON public.calendar_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = calendar_events.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for calendar_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;