-- Continuité de Steeve (demande de l'admin du 26.10.2026 : « évite les coupures ou extinctions de Steeve »).
-- Constat : un message client de 08h33 (Diana Julia Vuagniaux) est resté sans réponse parce que la conversation était
-- encore « agent » sans agent humain (ancien transfert ou secours technique) : le déclencheur ne réveillait pas Steeve,
-- et rien ne rattrapait le message ensuite.
-- 1) Reprise : une conversation « agent » SANS agent humain (handled_by_user vide), où aucun humain n'a écrit depuis
--    le transfert, et transférée depuis plus de 2 h, revient à Steeve au prochain message du client.
-- 2) Rattrapage (chaque minute, tâche planifiée steeve-rattrapage) : tout dernier message client (non automatique, non
--    masqué) de moins de 24 h, sans passage de Steeve et sans réponse depuis plus d'une minute, est relancé.
-- 3) Un passage bloqué transmis à l'agent par secours technique revient aussi à Steeve après 2 h sans humain (1).
-- Additive et idempotente.

-- Une conversation peut-elle (re)venir à Steeve ? Jamais si un humain l'a prise en main ou y a écrit depuis.
CREATE OR REPLACE FUNCTION public.steeve_peut_reprendre(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
     WHERE c.id = p_conversation_id
       AND c.conversation_type = 'client-agent'
       AND public.steeve_enabled_for_conversation(c.id)
       AND (c.handled_by = 'steeve'
            OR (c.handled_by_user IS NULL
                AND coalesce(c.handled_since, 'epoch'::timestamptz) < now() - interval '2 hours'
                AND NOT EXISTS (SELECT 1 FROM public.messages m
                                 WHERE m.conversation_id = c.id AND m.sender_type IN ('agent', 'admin')
                                   AND NOT coalesce(m.masque_messagerie, false)
                                   AND m.created_at >= coalesce(c.handled_since, 'epoch'::timestamptz))))
  );
$$;
REVOKE ALL ON FUNCTION public.steeve_peut_reprendre(uuid) FROM PUBLIC, anon, authenticated;

-- Lance un passage de réponse pour un message client (une seule fois par message).
CREATE OR REPLACE FUNCTION public.steeve_lancer_reponse(p_conversation_id uuid, p_message_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run uuid;
  v_client text;
BEGIN
  UPDATE public.conversations
     SET handled_by = 'steeve', handled_by_user = NULL, handled_since = now()
   WHERE id = p_conversation_id AND handled_by <> 'steeve';
  SELECT client_id INTO v_client FROM public.conversations WHERE id = p_conversation_id;
  INSERT INTO public.steeve_runs (conversation_id, client_id, trigger_message_id, kind)
  VALUES (p_conversation_id, v_client, p_message_id, 'reply')
  ON CONFLICT (trigger_message_id) DO NOTHING
  RETURNING id INTO v_run;
  IF v_run IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/steeve-turn',
      headers := private.edge_service_headers(),
      body := jsonb_build_object('run_id', v_run),
      timeout_milliseconds := 60000
    );
  END IF;
  RETURN v_run;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_lancer_reponse(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.steeve_dispatch_client_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sender_type <> 'client' OR COALESCE(NEW.masque_messagerie, false) THEN
    RETURN NEW;
  END IF;
  -- Une pièce déposée au dossier est déjà classée : pas de réponse de Steeve à chaque fichier.
  IF COALESCE(NEW.payload ->> 'kind', '') = 'dossier_document' THEN
    RETURN NEW;
  END IF;
  -- Conversation à Steeve, ou reprise possible (aucun humain ne s'en occupe) : Steeve répond.
  IF NOT public.steeve_peut_reprendre(NEW.conversation_id) THEN
    RETURN NEW;
  END IF;
  PERFORM public.steeve_lancer_reponse(NEW.conversation_id, NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Steeve ne doit jamais empêcher l'envoi d'un message : en cas de souci, le message est gardé (rattrapé ensuite).
  RAISE WARNING 'steeve_dispatch_client_message: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Rattrapage des messages clients restés sans réponse (tâche planifiée steeve-rattrapage, chaque minute).
CREATE OR REPLACE FUNCTION public.steeve_rattraper_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_n integer := 0;
BEGIN
  IF NOT COALESCE((SELECT value = 'true' FROM public.app_config WHERE key = 'steeve_enabled'), false) THEN
    RETURN 0;
  END IF;
  FOR r IN
    SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.id, m.sender_type, m.created_at, m.content, m.payload
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id AND c.conversation_type = 'client-agent'
     WHERE m.created_at > now() - interval '24 hours'
       AND NOT coalesce(m.masque_messagerie, false)
     ORDER BY m.conversation_id, m.created_at DESC
  LOOP
    EXIT WHEN v_n >= 10;
    CONTINUE WHEN r.sender_type <> 'client' OR r.created_at > now() - interval '1 minute';
    CONTINUE WHEN coalesce(r.payload ->> 'kind', '') = 'dossier_document' OR public.message_est_automatique(r.sender_type, r.content, r.payload);
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.steeve_runs s WHERE s.trigger_message_id = r.id);
    CONTINUE WHEN NOT public.steeve_peut_reprendre(r.conversation_id);
    BEGIN
      IF public.steeve_lancer_reponse(r.conversation_id, r.id) IS NOT NULL THEN
        v_n := v_n + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'steeve_rattraper_messages %: %', r.conversation_id, SQLERRM;
    END;
  END LOOP;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_rattraper_messages() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('steeve-rattrapage') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'steeve-rattrapage');
SELECT cron.schedule('steeve-rattrapage', '* * * * *', 'SELECT public.steeve_rattraper_messages()');
