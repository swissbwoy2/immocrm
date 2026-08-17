DROP POLICY IF EXISTS "Authenticated users can upload to message-attachments" ON storage.objects;

CREATE POLICY "Conversation participants can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (
    -- Administrateurs
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
    -- Agent titulaire de la conversation
    OR ((storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.conversations c
      JOIN public.agents a ON a.id::text = c.agent_id
      WHERE a.user_id = auth.uid()
    ))
    -- Co-agents rattachés à la conversation
    OR ((storage.foldername(name))[1] IN (
      SELECT ca.conversation_id::text FROM public.conversation_agents ca
      JOIN public.agents a ON a.id = ca.agent_id
      WHERE a.user_id = auth.uid()
    ))
    -- Client propriétaire de la conversation
    OR ((storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.conversations c
      JOIN public.clients cl ON cl.id::text = c.client_id
      WHERE cl.user_id = auth.uid()
    ))
    -- Pièces jointes d'offres : équipe interne uniquement
    OR (
      (storage.foldername(name))[1] = 'offers'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin'::app_role, 'agent'::app_role, 'coursier'::app_role, 'closeur'::app_role)
      )
    )
    -- Stories : dossier personnel de l'auteur
    OR (
      (storage.foldername(name))[1] = 'stories'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);