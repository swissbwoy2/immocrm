-- Correctif urgent : les messages des clients (et les messages visibles des agents) échouaient à l'insertion.
-- Depuis le 15.10.2026, notify_on_new_message comparait agents.id::text à conversation_agents.agent_id (uuid) :
-- « operator does not exist: text = uuid ». Le déclencheur on_new_message faisait alors échouer tout l'INSERT.
-- Aucun message de client n'avait été enregistré depuis le 15.10.2026 à 08:03 UTC.
-- Seule modification : « ca.agent_id » devient « ca.agent_id::text » (3 occurrences). Le reste est identique.
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_conversation RECORD;
  v_sender_name TEXT;
  v_recipient_user_id UUID;
  v_admin_record RECORD;
  v_agent_record RECORD;
  v_titre TEXT;
  v_lien_agent TEXT;
  v_lien_admin TEXT;
BEGIN
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;
  IF v_conversation IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(prenom || ' ' || nom, email) INTO v_sender_name
  FROM profiles WHERE id = NULLIF(NEW.sender_id,'')::uuid;

  -- Messages automatiques (offres, actions client, comptes rendus, rappels) : ils ne vont plus dans la messagerie,
  -- ils passent par les notifications.
  IF NEW.masque_messagerie THEN
    IF NEW.sender_type = 'client' THEN
      v_titre := left(btrim(regexp_replace(split_part(coalesce(NEW.content,''), E'\n', 1), '\*\*', '', 'g')), 90);
      v_lien_agent := CASE WHEN NEW.offre_id IS NOT NULL THEN '/agent/offres-envoyees?offreId=' || NEW.offre_id ELSE '/agent/messagerie?conversationId=' || NEW.conversation_id END;
      v_lien_admin := CASE WHEN NEW.offre_id IS NOT NULL THEN '/admin/offres-envoyees?offreId=' || NEW.offre_id ELSE '/admin/messagerie?conversationId=' || NEW.conversation_id END;
      FOR v_agent_record IN
        SELECT DISTINCT a.user_id FROM conversation_agents ca JOIN agents a ON a.id::text = ca.agent_id::text
        WHERE ca.conversation_id = NEW.conversation_id
      LOOP
        PERFORM create_notification(v_agent_record.user_id, 'client_action', COALESCE(v_sender_name, 'Client') || ' — ' || v_titre,
          v_titre, v_lien_agent, jsonb_build_object('conversation_id', NEW.conversation_id::text, 'offre_id', NEW.offre_id));
      END LOOP;
      FOR v_admin_record IN SELECT user_id FROM user_roles WHERE role = 'admin' LOOP
        PERFORM create_notification(v_admin_record.user_id, 'client_action', COALESCE(v_sender_name, 'Client') || ' — ' || v_titre,
          v_titre, v_lien_admin, jsonb_build_object('conversation_id', NEW.conversation_id::text, 'offre_id', NEW.offre_id));
      END LOOP;
    ELSIF NEW.sender_type IN ('agent','admin') AND coalesce(NEW.content,'') ~ '^\s*📋 Compte-rendu de la visite' AND v_conversation.client_id IS NOT NULL THEN
      SELECT user_id INTO v_recipient_user_id FROM clients WHERE id = v_conversation.client_id::uuid;
      IF v_recipient_user_id IS NOT NULL THEN
        PERFORM create_notification(v_recipient_user_id, 'compte_rendu_visite', 'Compte-rendu de visite disponible',
          left(btrim(regexp_replace(split_part(coalesce(NEW.content,''), E'\n', 1), '📋 ', '')), 90),
          '/client/visites', jsonb_build_object('offre_id', NEW.offre_id));
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.sender_type = 'agent' THEN
    IF v_conversation.client_id IS NOT NULL THEN
      SELECT user_id INTO v_recipient_user_id FROM clients WHERE id = v_conversation.client_id::uuid;
      IF v_recipient_user_id IS NOT NULL THEN
        PERFORM create_notification(v_recipient_user_id, 'new_message', 'Nouveau message',
          'Message de ' || COALESCE(v_sender_name, 'votre agent'),
          '/client/messagerie?conversationId=' || NEW.conversation_id,
          jsonb_build_object('conversation_id', NEW.conversation_id::text));
      END IF;
    END IF;
    FOR v_agent_record IN
      SELECT DISTINCT a.user_id FROM conversation_agents ca JOIN agents a ON a.id::text = ca.agent_id::text
      WHERE ca.conversation_id = NEW.conversation_id AND a.user_id != NULLIF(NEW.sender_id,'')::uuid
    LOOP
      PERFORM create_notification(v_agent_record.user_id, 'new_message', 'Nouveau message',
        'Message de ' || COALESCE(v_sender_name, 'un co-agent'),
        '/agent/messagerie?conversationId=' || NEW.conversation_id,
        jsonb_build_object('conversation_id', NEW.conversation_id::text));
    END LOOP;
  ELSIF NEW.sender_type = 'client' THEN
    FOR v_agent_record IN
      SELECT DISTINCT a.user_id FROM conversation_agents ca JOIN agents a ON a.id::text = ca.agent_id::text
      WHERE ca.conversation_id = NEW.conversation_id
    LOOP
      PERFORM create_notification(v_agent_record.user_id, 'new_message', 'Nouveau message',
        'Message de ' || COALESCE(v_sender_name, 'un client'),
        '/agent/messagerie?conversationId=' || NEW.conversation_id,
        jsonb_build_object('conversation_id', NEW.conversation_id::text));
    END LOOP;
    FOR v_admin_record IN SELECT user_id FROM user_roles WHERE role = 'admin' LOOP
      PERFORM create_notification(v_admin_record.user_id, 'new_message', 'Nouveau message client',
        'Message de ' || COALESCE(v_sender_name, 'un client'),
        '/admin/messagerie?conversationId=' || NEW.conversation_id,
        jsonb_build_object('conversation_id', NEW.conversation_id::text));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
