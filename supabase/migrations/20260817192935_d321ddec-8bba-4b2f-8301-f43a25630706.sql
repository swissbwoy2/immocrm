-- Stories : lecture pour tout utilisateur connecté
CREATE POLICY "stories_media_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = 'stories'
);

-- Pièces jointes des offres : lecture pour tout utilisateur connecté
CREATE POLICY "offer_attachments_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = 'offers'
);

-- Agents co-assignés à une conversation (table de liaison conversation_agents)
CREATE POLICY "conversation_agents_can_view_attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT ca.conversation_id::text
    FROM public.conversation_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE a.user_id = auth.uid()
  )
);