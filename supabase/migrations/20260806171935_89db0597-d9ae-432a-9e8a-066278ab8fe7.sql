CREATE TABLE public.automation_mcp_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  tool text NOT NULL,
  client_id uuid,
  document_id uuid,
  filename text,
  size_bytes integer,
  outcome text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.automation_mcp_audit TO authenticated;
GRANT ALL ON public.automation_mcp_audit TO service_role;

ALTER TABLE public.automation_mcp_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins lisent le journal MCP"
ON public.automation_mcp_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Le robot journalise ses propres actions"
ON public.automation_mcp_audit FOR INSERT TO authenticated
WITH CHECK (
  actor_user_id = auth.uid()
  AND public.has_role(auth.uid(), 'automation_operator'::app_role)
);

CREATE INDEX idx_automation_mcp_audit_created_at ON public.automation_mcp_audit (created_at DESC);

-- Stockage : lecture des documents clients pour le rôle automatisation
CREATE POLICY "Automation operator peut lire client-documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-documents'
  AND public.has_role(auth.uid(), 'automation_operator'::app_role)
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE (c.user_id)::text = (storage.foldername(name))[1]
  )
);

-- Stockage : dépôt de fichiers préparés, uniquement dans le dossier d'un client existant
CREATE POLICY "Automation operator peut deposer dans client-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND public.has_role(auth.uid(), 'automation_operator'::app_role)
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE (c.user_id)::text = (storage.foldername(name))[1]
  )
);