-- Steeve, lot 2c : premier message personnalisé (bilan du dossier) pour les clients location et achat.
-- Additive et idempotente. Rien ne change tant que Steeve est désactivé (steeve_enabled / pilote).
--  - Public visé : clients suivis (statut actif, suspendu, en attente) et nouveaux mandats pas encore activés
--    (demande de mandat en attente, facture envoyée ou payée), dans leur conversation avec l'agence.
--  - Au lancement, Steeve prend la conversation sauf si un agent l'a reprise explicitement ou y a écrit
--    dans les 48 dernières heures (elle sera accueillie plus tard, quand elle sera calme).
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
BEGIN
  -- Passages bloqués (fonction coupée, appel réseau perdu).
  FOR r IN
    UPDATE public.steeve_runs
       SET status = 'failed', reason = 'bloque', error = 'Passage resté sans fin plus de 5 minutes', finished_at = now()
     WHERE status IN ('queued', 'running')
       AND COALESCE(started_at, created_at) < now() - interval '5 minutes'
    RETURNING conversation_id, kind
  LOOP
    BEGIN
      IF r.kind = 'welcome' THEN
        -- Accueil bloqué : nouvel essai au passage suivant (deux au plus), sans message ni transfert.
        UPDATE public.conversations
           SET steeve_summary = (COALESCE(steeve_summary, '{}'::jsonb) - 'welcome_queued_at')
                 || jsonb_build_object('welcome_attempts', COALESCE((steeve_summary ->> 'welcome_attempts')::int, 0) + 1)
         WHERE id = r.conversation_id;
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

  -- Accueil : 20 conversations au plus par passage (lancement étalé, coût maîtrisé).
  FOR r IN
    SELECT c.id, c.client_id, c.handled_by, COALESCE((c.steeve_summary ->> 'welcome_attempts')::int, 0) AS attempts
      FROM public.conversations c
      JOIN public.clients cl ON cl.id::text = c.client_id
      LEFT JOIN public.demandes_mandat d ON d.id = cl.demande_mandat_id
     WHERE c.conversation_type = 'client-agent'
       AND COALESCE(c.steeve_summary ->> 'welcomed_at', '') = ''
       AND COALESCE(c.steeve_summary ->> 'welcome_queued_at', '') = ''
       AND (cl.statut IN ('actif', 'suspendu', 'en_attente') OR d.statut IN ('en_attente', 'facture_envoyee', 'paye'))
       AND public.steeve_enabled_for_conversation(c.id)
       AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = c.id AND m.sender_type = 'assistant')
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

  -- Veille : seulement les conversations confiées à Steeve.
  UPDATE public.conversations
     SET steeve_state = 'veille'
   WHERE steeve_state = 'active'
     AND handled_by = 'steeve'
     AND conversation_type = 'client-agent'
     AND last_client_message_at IS NOT NULL
     AND last_client_message_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_slept = ROW_COUNT;

  RETURN jsonb_build_object('enabled', true, 'accueils_lances', v_queued, 'accueils_standard', v_standard, 'veille', v_slept, 'bloques', v_stuck);
END;
$$;

REVOKE ALL ON FUNCTION public.steeve_scheduler_tick() FROM PUBLIC, anon, authenticated;
