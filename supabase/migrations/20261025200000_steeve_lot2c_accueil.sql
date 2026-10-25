-- Steeve, lot 2c : premier message personnalisé (bilan du dossier) pour les clients location et achat.
-- Additive et idempotente. Rien ne change tant que Steeve est désactivé (steeve_enabled / pilote).
--  - Public visé : clients suivis (statut actif, suspendu, en attente) et nouveaux mandats pas encore activés
--    (demande de mandat en attente, facture envoyée ou payée), dans leur conversation avec l'agence.
--  - Une seule conversation par client (la principale : la plus ancienne non archivée), jamais une conversation
--    dont le dernier message attend la réponse de l'agent.
--  - Au lancement, Steeve prend la conversation sauf si un agent l'a reprise explicitement ou y a écrit
--    dans les 48 dernières heures (elle sera accueillie plus tard, quand elle sera calme). Les agents concernés
--    reçoivent une notification récapitulative.
--  - Pas de nouvel accueil quand la moitié du plafond du jour ou le plafond du mois est atteint (reporté).
--  - Le message est rédigé par steeve-turn (passage « welcome ») ; accueil standard si le modèle n'est pas
--    disponible, et après deux essais bloqués.

CREATE OR REPLACE FUNCTION public.steeve_scheduler_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_prenom text;
  v_queued int := 0;
  v_standard int := 0;
  v_slept int := 0;
  v_stuck int := 0;
  v_user uuid;
  v_run uuid;
  v_spend jsonb;
  v_budget_ok boolean;
  v_taken jsonb := '{}'::jsonb;
  v_agent record;
BEGIN
  -- Passages bloqués (fonction coupée, appel réseau perdu).
  FOR r IN
    UPDATE public.steeve_runs
       SET status = 'failed', reason = 'bloque', error = 'Passage resté sans fin plus de 5 minutes', finished_at = now()
     WHERE status IN ('queued', 'running')
       AND COALESCE(started_at, created_at) < now() - interval '5 minutes'
    RETURNING conversation_id, kind, created_at
  LOOP
    BEGIN
      IF r.kind = 'welcome' THEN
        -- Accueil bloqué : nouvel essai au passage suivant (deux au plus), sans message ni transfert.
        UPDATE public.conversations
           SET steeve_summary = (COALESCE(steeve_summary, '{}'::jsonb) - 'welcome_queued_at')
                 || jsonb_build_object('welcome_attempts', COALESCE((steeve_summary ->> 'welcome_attempts')::int, 0) + 1)
         WHERE id = r.conversation_id;
        -- Un message du client arrivé pendant cet accueil a été écarté : il est relancé maintenant.
        PERFORM public.steeve_requeue_latest(r.conversation_id, r.created_at);
      ELSIF EXISTS (SELECT 1 FROM public.conversations WHERE id = r.conversation_id AND handled_by = 'steeve') THEN
        -- Réponse bloquée : le client n'est jamais laissé sans réponse.
        UPDATE public.conversations
           SET handled_by = 'agent', handled_by_user = NULL, handled_since = now()
         WHERE id = r.conversation_id;
        INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, payload)
        VALUES (r.conversation_id, 'steeve', 'assistant',
          'J’ai un petit souci technique et je préfère ne pas te répondre au hasard. J’ai transmis ton message à ton agent, qui te répondra ici.',
          jsonb_build_object('steeve', 'bloque'));
        FOR v_user IN
          SELECT DISTINCT a.user_id FROM public.conversation_agents ca
            JOIN public.agents a ON a.id::text = ca.agent_id::text
           WHERE ca.conversation_id = r.conversation_id
        LOOP
          PERFORM public.create_notification(v_user, 'new_message', 'Steeve vous transmet une conversation',
            'Steeve n’a pas pu répondre (souci technique). Merci de reprendre la conversation.',
            '/agent/messagerie?conversationId=' || r.conversation_id,
            jsonb_build_object('conversation_id', r.conversation_id::text, 'source', 'steeve_transfer'));
        END LOOP;
        v_stuck := v_stuck + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'steeve_scheduler_tick (passage bloqué %): %', r.conversation_id, SQLERRM;
    END;
  END LOOP;

  IF NOT COALESCE((SELECT value = 'true' FROM public.app_config WHERE key = 'steeve_enabled'), false) THEN
    RETURN jsonb_build_object('enabled', false, 'bloques', v_stuck);
  END IF;

  -- Budget : pas de nouvel accueil au-delà de la moitié du plafond du jour ou du plafond du mois.
  v_spend := public.steeve_spend(NULL);
  v_budget_ok := COALESCE((v_spend ->> 'day_usd')::numeric, 0)
                   < 0.5 * COALESCE((SELECT nullif(value, '')::numeric FROM public.app_config WHERE key = 'steeve_budget_day_usd'), 3)
             AND COALESCE((v_spend ->> 'month_usd')::numeric, 0)
                   < COALESCE((SELECT nullif(value, '')::numeric FROM public.app_config WHERE key = 'steeve_budget_month_usd'), 30);

  -- Accueil : 20 conversations au plus par passage (lancement étalé, coût maîtrisé).
  FOR r IN
    SELECT c.id, c.client_id, c.handled_by, COALESCE((c.steeve_summary ->> 'welcome_attempts')::int, 0) AS attempts
      FROM (
        -- Conversation principale de chaque client concerné : la plus ancienne non archivée.
        SELECT DISTINCT ON (c0.client_id) c0.id
          FROM public.conversations c0
          JOIN public.clients cl ON cl.id::text = c0.client_id
          LEFT JOIN public.demandes_mandat d ON d.id = cl.demande_mandat_id
         WHERE v_budget_ok
           AND c0.conversation_type = 'client-agent'
           AND NOT COALESCE(c0.is_archived, false)
           AND (cl.statut IN ('actif', 'suspendu', 'en_attente')
                OR (d.statut IN ('en_attente', 'facture_envoyee', 'paye') AND COALESCE(cl.statut, '') NOT IN ('stoppe', 'reloge')))
         ORDER BY c0.client_id, c0.created_at ASC NULLS LAST, c0.id
      ) main
      JOIN public.conversations c ON c.id = main.id
     WHERE COALESCE(c.steeve_summary ->> 'welcomed_at', '') = ''
       AND COALESCE(c.steeve_summary ->> 'welcome_queued_at', '') = ''
       AND public.steeve_enabled_for_conversation(c.id)
       -- Le client n'a jamais été accueilli dans aucune de ses conversations.
       AND NOT EXISTS (
         SELECT 1 FROM public.conversations o
          WHERE o.client_id = c.client_id AND o.conversation_type = 'client-agent'
            AND (COALESCE(o.steeve_summary ->> 'welcomed_at', '') <> '' OR COALESCE(o.steeve_summary ->> 'welcome_queued_at', '') <> ''
                 OR EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = o.id AND m.sender_type = 'assistant')))
       -- Pas de question du client en attente de réponse : l'accueil ne la remplace pas.
       AND COALESCE((SELECT m.sender_type FROM public.messages m
                       WHERE m.conversation_id = c.id AND NOT COALESCE(m.masque_messagerie, false)
                       ORDER BY m.created_at DESC LIMIT 1), '') <> 'client'
       AND (c.handled_by = 'steeve'
            OR (c.handled_by_user IS NULL
                AND NOT EXISTS (
                  SELECT 1 FROM public.messages m
                   WHERE m.conversation_id = c.id
                     AND m.sender_type IN ('agent', 'admin')
                     AND NOT COALESCE(m.masque_messagerie, false)
                     AND m.created_at > now() - interval '48 hours')))
     ORDER BY c.last_message_at DESC NULLS LAST
     LIMIT 20
  LOOP
    BEGIN
      IF r.handled_by <> 'steeve' THEN
        UPDATE public.conversations
           SET handled_by = 'steeve', handled_by_user = NULL, handled_since = now()
         WHERE id = r.id;
        -- Agents de la conversation : prévenus une fois par passage (récapitulatif).
        FOR v_user IN
          SELECT DISTINCT a.user_id FROM public.conversation_agents ca
            JOIN public.agents a ON a.id::text = ca.agent_id::text
           WHERE ca.conversation_id = r.id AND a.user_id IS NOT NULL
        LOOP
          v_taken := jsonb_set(v_taken, ARRAY[v_user::text], to_jsonb(COALESCE((v_taken ->> v_user::text)::int, 0) + 1));
        END LOOP;
      END IF;

      IF r.attempts >= 2 THEN
        -- Deux essais bloqués : accueil standard, sans modèle.
        SELECT NULLIF(trim(p.prenom), '') INTO v_prenom
          FROM public.clients cl JOIN public.profiles p ON p.id = cl.user_id
         WHERE cl.id::text = r.client_id;
        INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, payload)
        VALUES (
          r.id, 'steeve', 'assistant',
          'Salut' || COALESCE(' ' || v_prenom, '') || ', je suis Steeve, ton assistant de poche chez Logisorama ! '
            || 'Je suis disponible ici 24h/24 et 7j/7.' || E'\n'
            || 'Tu peux me demander où en sont ton dossier, tes offres, tes visites, tes candidatures et ton mandat, '
            || 'et déposer tes documents avec le trombone : ils sont classés directement dans ton dossier. Par quoi veux-tu commencer ?',
          jsonb_build_object('steeve', 'welcome', 'standard', true)
        );
        UPDATE public.conversations
           SET steeve_summary = COALESCE(steeve_summary, '{}'::jsonb) || jsonb_build_object('welcomed_at', now())
         WHERE id = r.id;
        v_standard := v_standard + 1;
      ELSE
        INSERT INTO public.steeve_runs (conversation_id, client_id, kind)
        VALUES (r.id, r.client_id, 'welcome')
        RETURNING id INTO v_run;
        UPDATE public.conversations
           SET steeve_summary = COALESCE(steeve_summary, '{}'::jsonb) || jsonb_build_object('welcome_queued_at', now())
         WHERE id = r.id;
        PERFORM net.http_post(
          url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/steeve-turn',
          headers := private.edge_service_headers(),
          body := jsonb_build_object('run_id', v_run),
          timeout_milliseconds := 60000
        );
        v_queued := v_queued + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'steeve_scheduler_tick (accueil %): %', r.id, SQLERRM;
    END;
  END LOOP;

  FOR v_agent IN SELECT key, value FROM jsonb_each_text(v_taken) LOOP
    BEGIN
      PERFORM public.create_notification(v_agent.key::uuid, 'new_message', 'Steeve prend le relais',
        'Steeve accueille ' || v_agent.value || ' conversation(s) client calme(s). Vous pouvez reprendre la main à tout moment depuis la conversation.',
        '/agent/messagerie', jsonb_build_object('source', 'steeve_takeover', 'count', v_agent.value::int));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'steeve_scheduler_tick (notification %): %', v_agent.key, SQLERRM;
    END;
  END LOOP;

  -- Veille : seulement les conversations confiées à Steeve.
  UPDATE public.conversations
     SET steeve_state = 'veille'
   WHERE steeve_state = 'active'
     AND handled_by = 'steeve'
     AND conversation_type = 'client-agent'
     AND last_client_message_at IS NOT NULL
     AND last_client_message_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_slept = ROW_COUNT;

  RETURN jsonb_build_object('enabled', true, 'budget_accueil', v_budget_ok, 'accueils_lances', v_queued, 'accueils_standard', v_standard, 'veille', v_slept, 'bloques', v_stuck);
END;
$$;

REVOKE ALL ON FUNCTION public.steeve_scheduler_tick() FROM PUBLIC, anon, authenticated;
