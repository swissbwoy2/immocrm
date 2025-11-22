-- Activer le realtime pour la table visites
ALTER TABLE public.visites REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visites;