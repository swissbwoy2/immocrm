
-- Enable realtime for calendar_events and candidatures (visites already enabled)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidatures;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
