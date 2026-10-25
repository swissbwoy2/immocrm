-- Steeve, lot 1 : fondations de la messagerie (sans IA).
-- Migration additive et idempotente : aucune ligne existante n'est supprimée ;
-- seule la colonne nouvelle last_client_message_at est remplie depuis l'historique.

-- 1) Expéditeurs autorisés.
--    'proprietaire' et 'system' sont déjà envoyés par l'application mais étaient refusés
--    (src/pages/proprietaire/Messagerie.tsx, src/lib/offreStatus.ts) ; 'assistant' = Steeve.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_type_check
  CHECK (sender_type = ANY (ARRAY['agent','client','admin','proprietaire','system','assistant']::text[]));

-- 2) Identifiant d'envoi généré par l'appareil : un renvoi après coupure ne crée pas de doublon.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_msg_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_msg_id_key
  ON public.messages (client_msg_id) WHERE client_msg_id IS NOT NULL;

-- 3) Seul le serveur peut publier ou réécrire un message au nom de Steeve.
CREATE OR REPLACE FUNCTION public.guard_assistant_sender()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND (NEW.sender_type = 'assistant'
          OR (TG_OP = 'UPDATE' AND OLD.sender_type = 'assistant' AND NEW.sender_type IS DISTINCT FROM OLD.sender_type)) THEN
    RAISE EXCEPTION 'Seul le serveur peut publier un message de Steeve' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_assistant_sender ON public.messages;
CREATE TRIGGER trg_guard_assistant_sender
  BEFORE INSERT OR UPDATE OF sender_type ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_assistant_sender();

-- 4) État de prise en charge de chaque conversation (Steeve ou agent humain).
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS handled_by text NOT NULL DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS handled_by_user uuid,
  ADD COLUMN IF NOT EXISTS handled_since timestamptz,
  ADD COLUMN IF NOT EXISTS steeve_state text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS steeve_summary jsonb,
  ADD COLUMN IF NOT EXISTS last_client_message_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_handled_by_check') THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_handled_by_check CHECK (handled_by IN ('agent', 'steeve'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_steeve_state_check') THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_steeve_state_check CHECK (steeve_state IN ('active', 'veille'));
  END IF;
END;
$$;

-- Dernier message réel du client, pour la future mise en veille après 48 heures.
UPDATE public.conversations c
   SET last_client_message_at = m.last_at
  FROM (
    SELECT conversation_id, max(created_at) AS last_at
      FROM public.messages
     WHERE sender_type = 'client' AND NOT COALESCE(masque_messagerie, false)
     GROUP BY conversation_id
  ) m
 WHERE m.conversation_id = c.id
   AND c.last_client_message_at IS DISTINCT FROM m.last_at;

-- 5) Ces champs ne se modifient que par les fonctions serveur ci-dessous, jamais depuis le navigateur.
CREATE OR REPLACE FUNCTION public.guard_conversation_steeve_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.handled_by <> 'agent' OR NEW.handled_by_user IS NOT NULL OR NEW.handled_since IS NOT NULL
       OR NEW.steeve_state <> 'active' OR NEW.steeve_summary IS NOT NULL OR NEW.last_client_message_at IS NOT NULL THEN
      RAISE EXCEPTION 'Champs de prise en charge réservés au serveur' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.handled_by IS DISTINCT FROM OLD.handled_by
     OR NEW.handled_by_user IS DISTINCT FROM OLD.handled_by_user
     OR NEW.handled_since IS DISTINCT FROM OLD.handled_since
     OR NEW.steeve_state IS DISTINCT FROM OLD.steeve_state
     OR NEW.steeve_summary IS DISTINCT FROM OLD.steeve_summary
     OR NEW.last_client_message_at IS DISTINCT FROM OLD.last_client_message_at THEN
    RAISE EXCEPTION 'Champs de prise en charge réservés au serveur' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_conversation_steeve_fields ON public.conversations;
CREATE TRIGGER trg_guard_conversation_steeve_fields
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.guard_conversation_steeve_fields();

-- 6) Suivi automatique à chaque message visible :
--    - message du client : date du dernier message, conversation réveillée ;
--    - message écrit par un agent ou un admin connecté : la conversation passe en mode agent
--      (les messages automatiques du serveur, comme les offres envoyées, ne changent rien).
CREATE OR REPLACE FUNCTION public.steeve_track_conversation_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.masque_messagerie, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_type = 'client' THEN
    UPDATE public.conversations
       SET last_client_message_at = GREATEST(COALESCE(last_client_message_at, NEW.created_at), NEW.created_at),
           steeve_state = 'active'
     WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type IN ('agent', 'admin') AND COALESCE(auth.role(), '') = 'authenticated' THEN
    UPDATE public.conversations
       SET handled_by = 'agent',
           handled_by_user = auth.uid(),
           handled_since = now()
     WHERE id = NEW.conversation_id
       AND handled_by = 'steeve';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_steeve_track_conversation_activity ON public.messages;
CREATE TRIGGER trg_steeve_track_conversation_activity
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.steeve_track_conversation_activity();

-- 7) Réglage d'activation : Steeve reste désactivé tant qu'il n'est pas explicitement activé.
INSERT INTO public.app_config (key, value, updated_at)
VALUES ('steeve_enabled', 'false', now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_steeve_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'enabled', COALESCE((SELECT value = 'true' FROM public.app_config WHERE key = 'steeve_enabled'), false)
  );
$$;

-- 8) Prise en main et restitution, réservées aux admins et aux agents de la conversation.
CREATE OR REPLACE FUNCTION public.can_manage_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
        FROM public.conversation_agents ca
        JOIN public.agents a ON a.id::text = ca.agent_id::text
       WHERE ca.conversation_id = p_conversation_id
         AND a.user_id = auth.uid()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.conversation_take_over(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.conversations%ROWTYPE;
BEGIN
  IF NOT public.can_manage_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  UPDATE public.conversations
     SET handled_by = 'agent', handled_by_user = auth.uid(), handled_since = now()
   WHERE id = p_conversation_id
     AND conversation_type = 'client-agent'
     AND (handled_by <> 'agent' OR handled_by_user IS DISTINCT FROM auth.uid());

  SELECT * INTO v FROM public.conversations WHERE id = p_conversation_id;
  RETURN jsonb_build_object('handled_by', v.handled_by, 'handled_by_user', v.handled_by_user, 'handled_since', v.handled_since);
END;
$$;

CREATE OR REPLACE FUNCTION public.conversation_give_back(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.conversations%ROWTYPE;
BEGIN
  IF NOT public.can_manage_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF NOT COALESCE((public.get_steeve_settings() ->> 'enabled')::boolean, false) THEN
    RAISE EXCEPTION 'Steeve n''est pas activé' USING ERRCODE = '55000';
  END IF;

  UPDATE public.conversations
     SET handled_by = 'steeve', handled_by_user = NULL, handled_since = now()
   WHERE id = p_conversation_id
     AND conversation_type = 'client-agent'
     AND handled_by <> 'steeve';

  SELECT * INTO v FROM public.conversations WHERE id = p_conversation_id;
  RETURN jsonb_build_object('handled_by', v.handled_by, 'handled_by_user', v.handled_by_user, 'handled_since', v.handled_since);
END;
$$;

REVOKE ALL ON FUNCTION public.get_steeve_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_conversation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.conversation_take_over(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.conversation_give_back(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_steeve_settings() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_conversation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.conversation_take_over(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.conversation_give_back(uuid) TO authenticated, service_role;
