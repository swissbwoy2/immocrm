-- Drop the old constraint and create a new one with more event types
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_event_type_check;

ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_event_type_check 
CHECK (event_type = ANY (ARRAY['rappel'::text, 'rendez_vous'::text, 'tache'::text, 'reunion'::text, 'autre'::text, 'etat_lieux'::text, 'visite'::text, 'signature'::text]));