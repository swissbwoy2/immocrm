DROP TRIGGER IF EXISTS trg_sync_visite_calendar_event ON public.visites;
DROP FUNCTION IF EXISTS public.sync_visite_to_calendar_event() CASCADE;