-- A. Storage policies for co-agents on client-documents bucket
CREATE POLICY "Co-agents peuvent uploader documents clients"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.client_agents ca ON ca.client_id = c.id
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE c.user_id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Co-agents peuvent supprimer documents clients"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.client_agents ca ON ca.client_id = c.id
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE c.user_id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Co-agents peuvent mettre à jour documents clients"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.client_agents ca ON ca.client_id = c.id
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE c.user_id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

-- D. Backfill conversation_agents for existing co-assignments
INSERT INTO public.conversation_agents (conversation_id, agent_id)
SELECT conv.id, ca.agent_id
FROM public.conversations conv
JOIN public.client_agents ca
  ON ca.client_id::text = conv.client_id
WHERE conv.client_id IS NOT NULL
  AND conv.conversation_type = 'client-agent'
ON CONFLICT DO NOTHING;