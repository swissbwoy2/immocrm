-- Messagerie : une seule conversation client ↔ agence par client.
--
-- Avant : une conversation par couple (client, agent). Chaque réassignation, chaque envoi depuis un autre agent
-- (admin, routine, Steeve, WhatsApp) pouvait créer ou choisir une autre conversation : le fil du client était éclaté.
--
-- Après :
--   * la conversation « client-agent » la plus ancienne d'un client est SA conversation (canonique) ;
--   * tout message posté dans une autre conversation client-agent du même client est redirigé vers la canonique
--     (quel que soit l'écran, la fonction serveur, la routine ou Steeve qui l'envoie) ;
--   * une conversation client-agent créée en double est aussitôt rattachée à la canonique et masquée ;
--   * un changement d'agent sur la fiche client met à jour l'agent de la conversation et l'y ajoute.
-- Rien n'est supprimé : les doublons restent en base (type « client-agent-fusionnee », colonne fusionnee_dans)
-- et chaque message déplacé est journalisé (conversation_fusions_journal).

-- 1) Traçabilité
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS fusionnee_dans uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.conversation_fusions_journal (
  id bigserial PRIMARY KEY,
  message_id uuid NOT NULL,
  ancienne_conversation uuid NOT NULL,
  nouvelle_conversation uuid NOT NULL,
  fusionne_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_fusions_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent le journal des fusions" ON public.conversation_fusions_journal;
CREATE POLICY "Admins lisent le journal des fusions" ON public.conversation_fusions_journal
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_conversations_client_type_created
  ON public.conversations (client_id, conversation_type, created_at);

-- 2) Conversation canonique d'un client
CREATE OR REPLACE FUNCTION public.conversation_unique_client(p_client_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.conversations
   WHERE client_id = p_client_id AND conversation_type = 'client-agent'
   ORDER BY created_at, id
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.conversation_unique_client(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_unique_client(text) TO authenticated, service_role;

-- 3) Rattacher à la canonique les agents d'une autre conversation (participants + agent principal)
CREATE OR REPLACE FUNCTION public.conversation_rattacher_agents(p_source uuid, p_cible uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_agents (conversation_id, agent_id)
  SELECT DISTINCT p_cible, ca.agent_id FROM public.conversation_agents ca WHERE ca.conversation_id = p_source
  ON CONFLICT (conversation_id, agent_id) DO NOTHING;

  INSERT INTO public.conversation_agents (conversation_id, agent_id)
  SELECT p_cible, a.id
    FROM public.conversations c
    JOIN public.agents a ON a.id::text = c.agent_id
   WHERE c.id = p_source
  ON CONFLICT (conversation_id, agent_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.conversation_rattacher_agents(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 4) Fusion des conversations d'un client dans sa canonique (idempotente)
CREATE OR REPLACE FUNCTION public.conversation_fusionner_client(p_client_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canon uuid;
  v_recent public.conversations%ROWTYPE;
  v_toutes_archivees boolean;
  v_last timestamptz;
  v_last_client timestamptz;
  v_agent_client text;
  v_moves integer := 0;
  v_n integer;
  d record;
BEGIN
  v_canon := public.conversation_unique_client(p_client_id);
  IF v_canon IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_recent FROM public.conversations
   WHERE client_id = p_client_id AND conversation_type = 'client-agent'
   ORDER BY last_message_at DESC NULLS LAST, created_at DESC
   LIMIT 1;

  SELECT bool_and(is_archived), max(last_message_at), max(last_client_message_at)
    INTO v_toutes_archivees, v_last, v_last_client
    FROM public.conversations
   WHERE client_id = p_client_id AND conversation_type = 'client-agent';

  FOR d IN
    SELECT id FROM public.conversations
     WHERE client_id = p_client_id AND conversation_type = 'client-agent' AND id <> v_canon
  LOOP
    PERFORM public.conversation_rattacher_agents(d.id, v_canon);

    INSERT INTO public.conversation_fusions_journal (message_id, ancienne_conversation, nouvelle_conversation)
    SELECT m.id, d.id, v_canon FROM public.messages m WHERE m.conversation_id = d.id;

    UPDATE public.messages SET conversation_id = v_canon WHERE conversation_id = d.id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_moves := v_moves + v_n;

    UPDATE public.steeve_runs SET conversation_id = v_canon WHERE conversation_id = d.id;
    UPDATE public.steeve_proposals SET conversation_id = v_canon WHERE conversation_id = d.id;
    UPDATE public.whatsapp_unknown_messages SET conversation_id = v_canon WHERE conversation_id = d.id;
    -- call_participants : historique des appels laissé tel quel (unicité par conversation et participant).

    UPDATE public.conversations
       SET conversation_type = 'client-agent-fusionnee',
           is_archived = true,
           status = 'archived',
           fusionnee_dans = v_canon
     WHERE id = d.id;
  END LOOP;

  SELECT cl.agent_id::text INTO v_agent_client FROM public.clients cl WHERE cl.id::text = p_client_id;

  UPDATE public.conversations c
     SET last_message_at = GREATEST(c.last_message_at, COALESCE(v_last, c.last_message_at)),
         last_client_message_at = GREATEST(c.last_client_message_at, v_last_client),
         is_archived = COALESCE(v_toutes_archivees, c.is_archived),
         status = CASE WHEN COALESCE(v_toutes_archivees, c.is_archived) THEN c.status ELSE 'active' END,
         agent_id = COALESCE(v_agent_client, c.agent_id),
         handled_by = COALESCE(v_recent.handled_by, c.handled_by),
         handled_by_user = CASE WHEN v_recent.id IS NOT NULL THEN v_recent.handled_by_user ELSE c.handled_by_user END,
         handled_since = CASE WHEN v_recent.id IS NOT NULL THEN v_recent.handled_since ELSE c.handled_since END,
         steeve_state = COALESCE(v_recent.steeve_state, c.steeve_state),
         steeve_summary = COALESCE(v_recent.steeve_summary, c.steeve_summary)
   WHERE c.id = v_canon;

  -- Agent actuel du client et co-agents : participants de la conversation
  INSERT INTO public.conversation_agents (conversation_id, agent_id)
  SELECT v_canon, cl.agent_id FROM public.clients cl WHERE cl.id::text = p_client_id AND cl.agent_id IS NOT NULL
  ON CONFLICT (conversation_id, agent_id) DO NOTHING;
  INSERT INTO public.conversation_agents (conversation_id, agent_id)
  SELECT v_canon, ca.agent_id FROM public.client_agents ca WHERE ca.client_id::text = p_client_id
  ON CONFLICT (conversation_id, agent_id) DO NOTHING;

  RETURN v_moves;
END;
$$;
REVOKE ALL ON FUNCTION public.conversation_fusionner_client(text) FROM PUBLIC, anon, authenticated;

-- 5) Tout nouveau message d'un client va dans sa conversation unique
CREATE OR REPLACE FUNCTION public.messages_vers_conversation_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  v_canon uuid;
BEGIN
  SELECT id, client_id, conversation_type, is_archived INTO v
    FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND OR v.client_id IS NULL OR v.conversation_type NOT IN ('client-agent', 'client-agent-fusionnee') THEN
    RETURN NEW;
  END IF;
  v_canon := public.conversation_unique_client(v.client_id);
  IF v_canon IS NULL OR v_canon = NEW.conversation_id THEN
    RETURN NEW;
  END IF;
  PERFORM public.conversation_rattacher_agents(NEW.conversation_id, v_canon);
  IF NOT v.is_archived THEN
    UPDATE public.conversations SET is_archived = false, status = 'active' WHERE id = v_canon AND is_archived;
  END IF;
  NEW.conversation_id := v_canon;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_0_messages_conversation_unique ON public.messages;
CREATE TRIGGER trg_0_messages_conversation_unique
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_vers_conversation_unique();

-- 6) Une conversation client-agent créée en double est rattachée à la canonique puis masquée
CREATE OR REPLACE FUNCTION public.conversations_creation_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canon uuid;
  v_agent_client text;
BEGIN
  IF NEW.conversation_type <> 'client-agent' OR NEW.client_id IS NULL THEN
    RETURN NULL;
  END IF;
  v_canon := public.conversation_unique_client(NEW.client_id);
  IF v_canon IS NULL OR v_canon = NEW.id THEN
    RETURN NULL;
  END IF;
  PERFORM public.conversation_rattacher_agents(NEW.id, v_canon);
  SELECT cl.agent_id::text INTO v_agent_client FROM public.clients cl WHERE cl.id::text = NEW.client_id;
  UPDATE public.conversations
     SET is_archived = false,
         status = 'active',
         agent_id = COALESCE(v_agent_client, agent_id)
   WHERE id = v_canon;
  UPDATE public.conversations
     SET conversation_type = 'client-agent-fusionnee',
         is_archived = true,
         status = 'archived',
         fusionnee_dans = v_canon
   WHERE id = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_zz_conversations_creation_unique ON public.conversations;
CREATE TRIGGER trg_zz_conversations_creation_unique
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.conversations_creation_unique();

-- 7) Changement d'agent sur la fiche client : la conversation suit (aucun participant n'est retiré)
CREATE OR REPLACE FUNCTION public.clients_agent_suivi_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canon uuid;
BEGIN
  IF NEW.agent_id IS NULL OR NEW.agent_id IS NOT DISTINCT FROM OLD.agent_id THEN
    RETURN NULL;
  END IF;
  v_canon := public.conversation_unique_client(NEW.id::text);
  IF v_canon IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE public.conversations
     SET agent_id = NEW.agent_id::text, is_archived = false, status = 'active'
   WHERE id = v_canon;
  INSERT INTO public.conversation_agents (conversation_id, agent_id)
  VALUES (v_canon, NEW.agent_id)
  ON CONFLICT (conversation_id, agent_id) DO NOTHING;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_agent_suivi_conversation ON public.clients;
CREATE TRIGGER trg_clients_agent_suivi_conversation
  AFTER UPDATE OF agent_id ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.clients_agent_suivi_conversation();

-- 8) Les conversations fusionnées n'apparaissent plus dans l'application (elles restent en base)
DROP POLICY IF EXISTS "Conversations fusionnees masquees" ON public.conversations;
CREATE POLICY "Conversations fusionnees masquees" ON public.conversations
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (conversation_type <> 'client-agent-fusionnee');

-- 9) Reprise : fusion de tous les clients qui ont plusieurs conversations
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT client_id FROM public.conversations
     WHERE conversation_type = 'client-agent' AND client_id IS NOT NULL
     GROUP BY client_id HAVING count(*) > 1
  LOOP
    PERFORM public.conversation_fusionner_client(r.client_id);
  END LOOP;
END;
$$;

-- 10) Reprise : l'agent actuel et les co-agents de chaque client participent à sa conversation
INSERT INTO public.conversation_agents (conversation_id, agent_id)
SELECT DISTINCT public.conversation_unique_client(cl.id::text), cl.agent_id
  FROM public.clients cl
 WHERE cl.agent_id IS NOT NULL AND public.conversation_unique_client(cl.id::text) IS NOT NULL
ON CONFLICT (conversation_id, agent_id) DO NOTHING;

INSERT INTO public.conversation_agents (conversation_id, agent_id)
SELECT DISTINCT public.conversation_unique_client(ca.client_id::text), ca.agent_id
  FROM public.client_agents ca
 WHERE public.conversation_unique_client(ca.client_id::text) IS NOT NULL
ON CONFLICT (conversation_id, agent_id) DO NOTHING;
