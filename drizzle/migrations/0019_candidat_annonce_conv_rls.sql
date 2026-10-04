CREATE OR REPLACE FUNCTION public.is_candidat_annonce_conv(_conv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations c
    WHERE c.id = _conv AND c.conversation_type = 'annonce' AND c.client_id = auth.uid()::text)
$$;
CREATE OR REPLACE FUNCTION public.is_annonce_conv(_conv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = _conv AND c.conversation_type = 'annonce')
$$;
REVOKE EXECUTE ON FUNCTION public.is_candidat_annonce_conv(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_annonce_conv(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_candidat_annonce_conv(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_annonce_conv(uuid) TO authenticated;

CREATE POLICY candidat_read_annonce_conversations ON public.conversations FOR SELECT TO authenticated
  USING (conversation_type = 'annonce' AND client_id = auth.uid()::text);
CREATE POLICY staff_read_annonce_conversations ON public.conversations FOR SELECT TO authenticated
  USING (conversation_type = 'annonce' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')));

CREATE POLICY candidat_read_annonce_messages ON public.messages FOR SELECT TO authenticated
  USING (public.is_candidat_annonce_conv(conversation_id));
CREATE POLICY candidat_send_annonce_messages ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid()::text AND public.is_candidat_annonce_conv(conversation_id));
CREATE POLICY agent_read_annonce_messages ON public.messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'agent') AND public.is_annonce_conv(conversation_id));
CREATE POLICY agent_send_annonce_messages ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid()::text AND public.has_role(auth.uid(),'agent') AND public.is_annonce_conv(conversation_id));