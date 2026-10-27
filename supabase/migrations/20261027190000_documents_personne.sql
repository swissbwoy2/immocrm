-- 27.10.2026 : déplacer un document vers la bonne personne du dossier (client principal, conjoint, garant…).
-- Cas réel : pièces de Banaz Mohammad (codébitrice) déposées depuis la messagerie et rangées chez Shakhawan.
-- Mêmes droits que la mise à jour directe d'un document (admin, client propriétaire, agent du client) :
-- aucune permission nouvelle, seule la personne rattachée change.

CREATE OR REPLACE FUNCTION public.document_changer_personne(p_document_id uuid, p_candidate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_doc record;
  v_label text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT d.id, d.client_id, d.user_id, d.type_document, d.candidate_id INTO v_doc
    FROM public.documents d WHERE d.id = p_document_id;
  IF NOT FOUND OR v_doc.client_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Document introuvable.');
  END IF;
  IF NOT (
       public.has_role(v_uid, 'admin'::app_role)
    OR v_doc.user_id = v_uid
    OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = v_doc.client_id AND c.user_id = v_uid)
    OR EXISTS (SELECT 1 FROM public.clients c JOIN public.agents a ON a.id = c.agent_id WHERE c.id = v_doc.client_id AND a.user_id = v_uid)
    OR EXISTS (SELECT 1 FROM public.client_agents ca JOIN public.agents a ON a.id = ca.agent_id WHERE ca.client_id = v_doc.client_id AND a.user_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_candidate_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.client_candidates WHERE id = p_candidate_id AND client_id = v_doc.client_id) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Cette personne ne fait pas partie du dossier.');
  END IF;
  IF v_doc.candidate_id IS NOT DISTINCT FROM p_candidate_id THEN
    RETURN jsonb_build_object('ok', true, 'inchange', true);
  END IF;

  UPDATE public.documents SET candidate_id = p_candidate_id WHERE id = p_document_id;

  -- La pièce demandée à cette personne est maintenant reçue.
  IF coalesce(v_doc.type_document, 'autre') <> 'autre' THEN
    UPDATE public.document_requests
       SET status = 'fulfilled', fulfilled_at = now(), updated_at = now()
     WHERE id = (
       SELECT id FROM public.document_requests
        WHERE client_id = v_doc.client_id AND status = 'pending'
          AND document_type = v_doc.type_document
          AND candidate_id IS NOT DISTINCT FROM p_candidate_id
        ORDER BY created_at ASC LIMIT 1);
  END IF;

  SELECT coalesce(nullif(trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')), ''), 'personne liée') INTO v_label
    FROM public.client_candidates WHERE id = p_candidate_id;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app',
          CASE WHEN public.has_role(v_uid, 'admin'::app_role) THEN 'admin'
               WHEN v_doc.user_id = v_uid OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = v_doc.client_id AND c.user_id = v_uid) THEN 'client'
               ELSE 'agent' END,
          v_doc.client_id, 'fait', 'humain',
          left('Document rattaché à ' || coalesce(v_label, 'client principal'), 300), now(), 'documents ' || p_document_id,
          'personne:' || p_document_id || ':' || coalesce(p_candidate_id::text, 'client') || ':' || extract(epoch FROM now())::bigint,
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')))
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'personne', coalesce(v_label, 'client principal'));
END;
$function$;

REVOKE ALL ON FUNCTION public.document_changer_personne(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.document_changer_personne(uuid, uuid) TO authenticated;

-- Pièces déposées avec le trombone (payload.kind = 'dossier_document', verification = 'a_verifier') : Steeve les
-- contrôle 10 minutes après le dernier dépôt (bon type, bonne personne, date), les reclasse si besoin et écrit un
-- seul message au client. Une demande de contrôle par série de dépôts ; un message du client entre-temps : sa
-- réponse normale voit aussi les pièces.
CREATE OR REPLACE FUNCTION public.steeve_controler_depots(p_limit integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  v_run uuid;
  n integer := 0;
BEGIN
  FOR v IN
    SELECT DISTINCT ON (m.conversation_id) m.id, m.conversation_id, c.client_id
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id AND c.handled_by = 'steeve' AND c.conversation_type = 'client-agent'
     WHERE m.sender_type = 'client'
       AND m.payload ->> 'kind' = 'dossier_document'
       AND m.payload ->> 'verification' = 'a_verifier'
       AND m.payload ->> 'controle_demande' IS NULL
       AND m.created_at > now() - interval '72 hours'
       AND NOT coalesce(m.masque_messagerie, false)
       AND public.steeve_client_servi(c.client_id::uuid)
       -- Série terminée : aucun message du client depuis 10 minutes.
       AND NOT EXISTS (SELECT 1 FROM public.messages x WHERE x.conversation_id = m.conversation_id AND x.sender_type = 'client'
                         AND x.created_at > m.created_at)
       AND m.created_at < now() - interval '10 minutes'
     ORDER BY m.conversation_id, m.created_at DESC
     LIMIT least(greatest(coalesce(p_limit, 5), 1), 20)
  LOOP
    UPDATE public.messages SET payload = payload || jsonb_build_object('controle_demande', now())
     WHERE conversation_id = v.conversation_id AND sender_type = 'client'
       AND payload ->> 'kind' = 'dossier_document' AND payload ->> 'verification' = 'a_verifier';
    INSERT INTO public.steeve_runs (conversation_id, client_id, trigger_message_id, kind, reason)
    VALUES (v.conversation_id, v.client_id, v.id, 'reply', 'controle_documents')
    ON CONFLICT (trigger_message_id) DO NOTHING
    RETURNING id INTO v_run;
    IF v_run IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/steeve-turn',
        headers := private.edge_service_headers(),
        body := jsonb_build_object('run_id', v_run),
        timeout_milliseconds := 60000);
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_controler_depots(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_controler_depots(integer) TO service_role;
