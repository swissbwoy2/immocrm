-- Enable realtime on candidatures table
ALTER TABLE public.candidatures REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidatures;