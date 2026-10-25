-- Steeve, lot 2 : Steeve répond en lecture seule (dossier, offres, visites, candidatures, documents, mandat).
-- Additive et idempotente. Rien ne change tant que app_config.steeve_enabled vaut 'false'
-- et que le client n'est pas dans la liste pilote.

-- 1) Réglages (modifiables par un admin dans app_config ; montants en USD).
INSERT INTO public.app_config (key, value, updated_at) VALUES
  ('steeve_pilot_client_ids', '', now()),          -- identifiants clients séparés par des virgules, ou 'all'
  ('steeve_model', 'claude-haiku-5-5', now()),
  ('steeve_budget_month_usd', '30', now()),
  ('steeve_alert_month_usd', '20', now()),
  ('steeve_budget_day_usd', '3', now()),
  ('steeve_client_day_usd', '0.5', now()),
  ('steeve_client_day_messages', '40', now())
ON CONFLICT (key) DO NOTHING;

-- 2) Steeve est-il actif pour cette conversation ? (réglage global + client pilote + conversation client-agent)
CREATE OR REPLACE FUNCTION public.steeve_enabled_for_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT value = 'true' FROM public.app_config WHERE key = 'steeve_enabled'), false)
     AND EXISTS (
       SELECT 1
         FROM public.conversations c
        WHERE c.id = p_conversation_id
          AND c.conversation_type = 'client-agent'
          AND c.client_id IS NOT NULL
          AND (
            COALESCE((SELECT trim(value) FROM public.app_config WHERE key = 'steeve_pilot_client_ids'), '') = 'all'
            OR c.client_id = ANY (string_to_array(
                 replace(COALESCE((SELECT value FROM public.app_config WHERE key = 'steeve_pilot_client_ids'), ''), ' ', ''),
                 ','))
          )
     );
$$;

-- Réglage vu par l'interface pour une conversation donnée (bandeau, boutons de prise en main).
CREATE OR REPLACE FUNCTION public.get_steeve_settings(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('enabled', public.steeve_enabled_for_conversation(p_conversation_id));
$$;

-- La restitution à Steeve n'est possible que si Steeve est actif pour ce client.
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
  IF NOT public.steeve_enabled_for_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Steeve n''est pas activé pour ce client' USING ERRCODE = '55000';
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

-- 3) Journal des passages de Steeve : un passage par message client, avec son coût.
CREATE TABLE IF NOT EXISTS public.steeve_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  client_id text,
  trigger_message_id uuid UNIQUE,
  kind text NOT NULL DEFAULT 'reply',
  status text NOT NULL DEFAULT 'queued',
  reason text,
  reply_message_id uuid,
  model text,
  calls integer NOT NULL DEFAULT 0,
  input_tokens integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  web_searches integer NOT NULL DEFAULT 0,
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  tools_used text[] NOT NULL DEFAULT '{}',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  CONSTRAINT steeve_runs_status_check CHECK (status IN ('queued', 'running', 'done', 'skipped', 'capped', 'failed')),
  CONSTRAINT steeve_runs_kind_check CHECK (kind IN ('reply', 'welcome'))
);
CREATE INDEX IF NOT EXISTS steeve_runs_conversation_idx ON public.steeve_runs (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS steeve_runs_created_idx ON public.steeve_runs (created_at DESC);

ALTER TABLE public.steeve_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent le journal de Steeve" ON public.steeve_runs;
CREATE POLICY "Admins lisent le journal de Steeve" ON public.steeve_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Prise du passage : un seul passage à la fois par conversation (les messages arrivés entre-temps
-- sont traités par le passage en cours, qui relit la conversation avant de répondre).
CREATE OR REPLACE FUNCTION public.steeve_claim_run(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.steeve_runs%ROWTYPE;
BEGIN
  SELECT * INTO v_run FROM public.steeve_runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'introuvable');
  END IF;
  IF v_run.status <> 'queued' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'deja_traite');
  END IF;
  -- Verrou de la conversation pour comparer avec les autres passages sans course.
  PERFORM 1 FROM public.conversations WHERE id = v_run.conversation_id FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM public.steeve_runs
     WHERE conversation_id = v_run.conversation_id
       AND id <> v_run.id
       AND status = 'running'
       AND started_at > now() - interval '3 minutes'
  ) THEN
    UPDATE public.steeve_runs
       SET status = 'skipped', reason = 'passage_en_cours', finished_at = now()
     WHERE id = p_run_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'passage_en_cours');
  END IF;
  UPDATE public.steeve_runs SET status = 'running', started_at = now() WHERE id = p_run_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.steeve_claim_run(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_claim_run(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.steeve_enabled_for_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_enabled_for_conversation(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_steeve_settings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_steeve_settings(uuid) TO authenticated, service_role;

-- 4) Chaque message visible du client, dans une conversation confiée à Steeve, lance un passage.
CREATE OR REPLACE FUNCTION public.steeve_dispatch_client_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv public.conversations%ROWTYPE;
  v_run_id uuid;
BEGIN
  IF NEW.sender_type <> 'client' OR COALESCE(NEW.masque_messagerie, false) THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND OR v_conv.handled_by <> 'steeve' THEN
    RETURN NEW;
  END IF;
  IF NOT public.steeve_enabled_for_conversation(NEW.conversation_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.steeve_runs (conversation_id, client_id, trigger_message_id, kind)
  VALUES (NEW.conversation_id, v_conv.client_id, NEW.id, 'reply')
  ON CONFLICT (trigger_message_id) DO NOTHING
  RETURNING id INTO v_run_id;

  IF v_run_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/steeve-turn',
      headers := private.edge_service_headers(),
      body := jsonb_build_object('run_id', v_run_id),
      timeout_milliseconds := 60000
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Steeve ne doit jamais empêcher l'envoi d'un message : en cas de souci, le message est gardé.
  RAISE WARNING 'steeve_dispatch_client_message: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_steeve_dispatch_client_message ON public.messages;
CREATE TRIGGER trg_steeve_dispatch_client_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.steeve_dispatch_client_message();

-- 5) Le client absent est prévenu d'une réponse de Steeve (sans détail dans la notification).
CREATE OR REPLACE FUNCTION public.steeve_notify_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv public.conversations%ROWTYPE;
  v_client_user uuid;
BEGIN
  IF NEW.sender_type <> 'assistant' OR COALESCE(NEW.masque_messagerie, false) THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND OR v_conv.client_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Client en train d'écrire (message dans les 5 dernières minutes) : il voit la réponse, pas de notification.
  IF v_conv.last_client_message_at IS NOT NULL AND v_conv.last_client_message_at > now() - interval '5 minutes' THEN
    RETURN NEW;
  END IF;
  SELECT user_id INTO v_client_user FROM public.clients WHERE id::text = v_conv.client_id;
  IF v_client_user IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM public.create_notification(
    v_client_user, 'new_message', 'Nouveau message de Steeve',
    'Steeve t''a écrit dans ta messagerie Logisorama.',
    '/client/messagerie?conversationId=' || NEW.conversation_id,
    jsonb_build_object('conversation_id', NEW.conversation_id::text, 'source', 'steeve')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'steeve_notify_client: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_steeve_notify_client ON public.messages;
CREATE TRIGGER trg_steeve_notify_client
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.steeve_notify_client();

-- 6) Tâche planifiée Steeve (SQL seul, aucun appel IA) :
--    - accueil envoyé une seule fois quand Steeve devient actif pour un client ;
--    - mise en veille des conversations sans message du client depuis 48 heures.
CREATE OR REPLACE FUNCTION public.steeve_scheduler_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_prenom text;
  v_welcomed int := 0;
  v_slept int := 0;
BEGIN
  IF NOT COALESCE((SELECT value = 'true' FROM public.app_config WHERE key = 'steeve_enabled'), false) THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  FOR r IN
    SELECT c.id, c.client_id
      FROM public.conversations c
     WHERE c.conversation_type = 'client-agent'
       AND c.handled_by = 'steeve'
       AND COALESCE(c.steeve_summary ->> 'welcomed_at', '') = ''
       AND public.steeve_enabled_for_conversation(c.id)
       AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = c.id AND m.sender_type = 'assistant')
     LIMIT 50
  LOOP
    SELECT NULLIF(trim(p.prenom), '') INTO v_prenom
      FROM public.clients cl JOIN public.profiles p ON p.id = cl.user_id
     WHERE cl.id::text = r.client_id;

    INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, payload)
    VALUES (
      r.id, 'steeve', 'assistant',
      'Salut' || COALESCE(' ' || v_prenom, '') || ', je suis Steeve, l’assistant de Logisorama ! '
        || 'Tu peux m’écrire ici, et déposer tes documents avec le trombone : ils sont classés directement dans ton dossier. '
        || 'Je peux t’expliquer où en sont ton dossier, tes offres, tes visites, tes candidatures et ton mandat, '
        || 'et je transmets à ton agent ce que je ne peux pas faire moi-même. Par quoi veux-tu commencer ?',
      jsonb_build_object('steeve', 'welcome')
    );

    UPDATE public.conversations
       SET steeve_summary = COALESCE(steeve_summary, '{}'::jsonb) || jsonb_build_object('welcomed_at', now())
     WHERE id = r.id;
    v_welcomed := v_welcomed + 1;
  END LOOP;

  UPDATE public.conversations
     SET steeve_state = 'veille'
   WHERE steeve_state = 'active'
     AND conversation_type = 'client-agent'
     AND last_client_message_at IS NOT NULL
     AND last_client_message_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_slept = ROW_COUNT;

  RETURN jsonb_build_object('enabled', true, 'welcomed', v_welcomed, 'veille', v_slept);
END;
$$;

REVOKE ALL ON FUNCTION public.steeve_scheduler_tick() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'steeve-scheduler') THEN
    -- Toutes les 15 minutes de 7 h à 21 h (heure de Zurich en hiver ; 8 h à 22 h en été).
    PERFORM cron.schedule('steeve-scheduler', '*/15 6-20 * * *', 'SELECT public.steeve_scheduler_tick();');
  END IF;
END;
$$;

-- 7) Dépense de Steeve (USD) : mois et jour en cours (heure de Zurich), et pour un client aujourd'hui.
CREATE OR REPLACE FUNCTION public.steeve_spend(p_client_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich' AS month_start,
           date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich' AS day_start
  )
  SELECT jsonb_build_object(
    'month_usd', COALESCE((SELECT sum(cost_usd) FROM public.steeve_runs, bounds WHERE created_at >= bounds.month_start), 0),
    'day_usd', COALESCE((SELECT sum(cost_usd) FROM public.steeve_runs, bounds WHERE created_at >= bounds.day_start), 0),
    'client_day_usd', COALESCE((SELECT sum(cost_usd) FROM public.steeve_runs, bounds WHERE created_at >= bounds.day_start AND client_id = p_client_id), 0),
    'client_day_runs', (SELECT count(*) FROM public.steeve_runs, bounds WHERE created_at >= bounds.day_start AND client_id = p_client_id AND status IN ('done', 'capped'))
  );
$$;
REVOKE ALL ON FUNCTION public.steeve_spend(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_spend(text) TO service_role;
