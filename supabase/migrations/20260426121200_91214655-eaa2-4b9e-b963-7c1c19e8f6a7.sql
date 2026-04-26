ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_poursuites_extraction_method_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_poursuites_extraction_method_check
  CHECK (extrait_poursuites_extraction_method IS NULL OR extrait_poursuites_extraction_method IN ('ai', 'ai_auto_scan', 'manual', 'agent'));