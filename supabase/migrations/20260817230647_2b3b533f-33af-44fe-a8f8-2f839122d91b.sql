
CREATE OR REPLACE FUNCTION public.is_annonce_conversation_participant(_conv text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ok boolean;
BEGIN
  IF _conv IS NULL OR _conv !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.conversations_annonces c
    WHERE c.id = _conv::uuid
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
  ) INTO ok;
  RETURN ok;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_annonce_conversation_participant(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_annonce_conversation_participant(text) TO authenticated;

DROP POLICY IF EXISTS "Annonce conv participants can read attachments" ON storage.objects;
CREATE POLICY "Annonce conv participants can read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'annonce-attachments'
    AND public.is_annonce_conversation_participant((storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Annonce conv participants can upload attachments" ON storage.objects;
CREATE POLICY "Annonce conv participants can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'annonce-attachments'
    AND public.is_annonce_conversation_participant((storage.foldername(name))[1]));
