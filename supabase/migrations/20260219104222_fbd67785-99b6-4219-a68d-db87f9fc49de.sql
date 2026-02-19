
CREATE POLICY "Agents co-assignés peuvent voir documents clients (user_id folder)"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.client_agents ca ON ca.client_id = c.id
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE c.user_id::text = (storage.foldername(name))[1]
    AND a.user_id = auth.uid()
  )
);
