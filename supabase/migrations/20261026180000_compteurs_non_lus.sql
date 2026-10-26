-- Compteurs de messages non lus par conversation, calculés en base (plus de plafond à 1000 lignes côté app).
-- SECURITY INVOKER : les règles d'accès (RLS) de l'utilisateur s'appliquent, il ne compte que ce qu'il voit.
CREATE OR REPLACE FUNCTION public.unread_message_counts(p_exclude_sender text DEFAULT NULL, p_only_sender text DEFAULT NULL)
RETURNS TABLE (conversation_id uuid, unread bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT m.conversation_id, count(*)::bigint
    FROM public.messages m
   WHERE m.read = false
     AND coalesce(m.masque_messagerie, false) = false
     AND (p_exclude_sender IS NULL OR m.sender_type <> p_exclude_sender)
     AND (p_only_sender IS NULL OR m.sender_type = p_only_sender)
   GROUP BY m.conversation_id;
$$;
REVOKE ALL ON FUNCTION public.unread_message_counts(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unread_message_counts(text, text) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_messages_unread_conv ON public.messages (conversation_id) WHERE read = false;
