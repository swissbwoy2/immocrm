-- Conversation « Steeve » de chaque administrateur, listée dans la Messagerie (lot 8, partie 2).
-- Steeve y poste tout ce qui demande une décision humaine, quel que soit le rôle de la personne (client, candidat,
-- propriétaire, annonceur, apporteur, coursier…) : propositions à valider, transferts, demandes « contacter l'équipe »,
-- alertes de l'opérateur. L'admin répond dans ce fil ; Steeve (steeve-admin, session de l'admin) exécute l'action
-- avec ses outils et répond lui-même à la personne.
-- Additive et idempotente. Les messages de Steeve sont publiés par le serveur seulement (guard_assistant_sender).

-- Conversation Steeve d'un admin (créée au premier besoin, avec un message d'accueil).
CREATE OR REPLACE FUNCTION public.steeve_admin_conv_for(p_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user IS NULL OR NOT public.has_role(p_user, 'admin'::app_role) THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_id FROM public.conversations
   WHERE conversation_type = 'steeve-admin' AND admin_user_id = p_user ORDER BY created_at LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;
  INSERT INTO public.conversations (conversation_type, admin_user_id, subject, status, last_message_at, created_at)
  VALUES ('steeve-admin', p_user, 'Steeve — demandes à valider', 'active', now(), now())
  RETURNING id INTO v_id;
  INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, payload, read)
  VALUES (v_id, 'steeve', 'assistant',
    'Salut ! C''est ici que je t''écris chaque fois qu''une demande a besoin de ta décision (clients, candidats, propriétaires, annonceurs, apporteurs, coursiers). Réponds-moi simplement dans ce fil (« oui, vas-y », « non », ou ta consigne) : je fais l''action et je réponds moi-même à la personne. Tu peux aussi me demander n''importe quoi sur un dossier.',
    jsonb_build_object('source', 'steeve_admin', 'cle', 'bienvenue'), false);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_admin_conv_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_admin_conv_for(uuid) TO service_role;

-- Pour l'admin connecté (Messagerie) : sa conversation Steeve.
CREATE OR REPLACE FUNCTION public.steeve_admin_conversation()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN public.steeve_admin_conv_for(auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_admin_conversation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_admin_conversation() TO authenticated;

-- Message de Steeve dans la conversation d'un admin (une seule fois par clé).
CREATE OR REPLACE FUNCTION public.steeve_post_admin(p_user uuid, p_cle text, p_text text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv uuid;
  v_id uuid;
BEGIN
  v_conv := public.steeve_admin_conv_for(p_user);
  IF v_conv IS NULL OR coalesce(trim(p_text), '') = '' THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = v_conv AND payload ->> 'cle' = p_cle) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, payload, read)
  VALUES (v_conv, 'steeve', 'assistant', left(p_text, 3000),
          coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('source', 'steeve_admin', 'cle', p_cle), false)
  RETURNING id INTO v_id;
  UPDATE public.conversations SET last_message_at = now() WHERE id = v_conv;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_post_admin(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_post_admin(uuid, text, text, jsonb) TO service_role;

-- Proposition à valider (client) → conversation Steeve de chaque admin.
CREATE OR REPLACE FUNCTION public.steeve_proposal_vers_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nom text;
  v_label text := CASE NEW.kind WHEN 'note_agent' THEN 'Demande d''un client'
                                WHEN 'relance_regie' THEN 'Relance de régie à valider'
                                WHEN 'preuve_paiement' THEN 'Preuve de paiement à vérifier'
                                WHEN 'changement_criteres' THEN 'Changement de critères'
                                ELSE 'Demande à valider' END;
  v_admin record;
BEGIN
  SELECT public.steeve_person_name(c.user_id) INTO v_nom FROM public.clients c WHERE c.id = NEW.client_id;
  FOR v_admin IN SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    PERFORM public.steeve_post_admin(v_admin.user_id, 'proposition:' || NEW.id,
      '👋 ' || v_label || ' — ' || coalesce(v_nom, 'un client') || E'\n' || coalesce(NEW.title, '') || E'\n\n' || left(coalesce(NEW.body, ''), 1200) ||
      E'\n\nTu me dis ? (« oui, vas-y », « non », ou ta consigne) : je m''en occupe et je réponds à ' || coalesce(split_part(v_nom, ' ', 1), 'la personne') || '.',
      jsonb_build_object('kind', 'demande_validation', 'type', NEW.kind, 'proposal_id', NEW.id, 'client_id', NEW.client_id,
                         'conversation_id', NEW.conversation_id, 'offre_id', NEW.offre_id));
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'steeve_proposal_vers_admin: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_steeve_proposal_vers_admin ON public.steeve_proposals;
CREATE TRIGGER trg_steeve_proposal_vers_admin AFTER INSERT ON public.steeve_proposals
  FOR EACH ROW EXECUTE FUNCTION public.steeve_proposal_vers_admin();

-- Notification de Steeve à un admin (transfert, action client, alerte de l'opérateur, « contacter l'équipe »
-- d'un propriétaire / annonceur / apporteur…) → aussi dans sa conversation Steeve.
CREATE OR REPLACE FUNCTION public.steeve_notification_vers_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src text := coalesce(NEW.metadata ->> 'source', '');
BEGIN
  IF NOT public.has_role(NEW.user_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NOT (coalesce(NEW.metadata ->> 'par', '') = 'steeve' OR v_src IN ('steeve_transfer', 'steeve_action', 'steeve_budget')
          OR NEW.type = 'steeve_partenaire') THEN
    RETURN NEW;
  END IF;
  PERFORM public.steeve_post_admin(NEW.user_id, 'notification:' || NEW.id,
    '👋 ' || coalesce(NEW.title, 'Pour toi') || E'\n' || coalesce(NEW.message, '') ||
    CASE WHEN coalesce(NEW.link, '') <> '' THEN E'\n\nOù : ' || NEW.link ELSE '' END ||
    E'\n\nTu veux que je fasse quelque chose ? Dis-le moi ici, je m''en occupe et je réponds à la personne.',
    jsonb_build_object('kind', 'demande', 'notification_id', NEW.id, 'type', NEW.type, 'source', nullif(v_src, ''),
                       'niveau', NEW.metadata ->> 'niveau', 'conversation_id', NEW.metadata ->> 'conversation_id',
                       'de', NEW.metadata ->> 'de', 'role', NEW.metadata ->> 'role', 'lien', NEW.link));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'steeve_notification_vers_admin: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_steeve_notification_vers_admin ON public.notifications;
CREATE TRIGGER trg_steeve_notification_vers_admin AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.steeve_notification_vers_admin();

-- Steeve écrit à une personne à la demande de l'admin (après sa décision) : dans la conversation du client,
-- sinon par notification (application, e-mail, push) pour les autres rôles. Appelée par steeve-admin
-- avec la session de l'admin : l'appelant doit être admin.
CREATE OR REPLACE FUNCTION public.steeve_admin_ecrire(p_message text, p_client_id uuid DEFAULT NULL, p_user_id uuid DEFAULT NULL, p_conversation_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv uuid;
  v_role text;
  v_txt text := left(trim(coalesce(p_message, '')), 2000);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF v_txt = '' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'message vide');
  END IF;
  IF p_conversation_id IS NOT NULL THEN
    SELECT id INTO v_conv FROM public.conversations
     WHERE id = p_conversation_id AND conversation_type IN ('client-agent', 'annonce');
  ELSIF p_client_id IS NOT NULL THEN
    SELECT id INTO v_conv FROM public.conversations
     WHERE client_id = p_client_id::text AND conversation_type = 'client-agent' AND NOT coalesce(is_archived, false)
     ORDER BY last_message_at DESC NULLS LAST LIMIT 1;
  END IF;
  IF v_conv IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, payload, read)
    VALUES (v_conv, 'steeve', 'assistant', v_txt, jsonb_build_object('steeve_admin', true, 'par', auth.uid()), false);
    UPDATE public.conversations SET last_message_at = now() WHERE id = v_conv;
    RETURN jsonb_build_object('ok', true, 'canal', 'conversation', 'conversation_id', v_conv);
  END IF;
  IF p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = p_user_id ORDER BY role::text LIMIT 1;
    PERFORM public.create_notification(p_user_id, 'steeve_message', 'Message de Steeve', v_txt,
      CASE v_role WHEN 'candidat' THEN '/candidat' WHEN 'proprietaire' THEN '/proprietaire' WHEN 'apporteur' THEN '/apporteur'
                  WHEN 'annonceur' THEN '/espace-annonceur' WHEN 'coursier' THEN '/coursier' WHEN 'agent' THEN '/agent' ELSE '/' END,
      jsonb_build_object('source', 'steeve_admin', 'par', auth.uid()));
    RETURN jsonb_build_object('ok', true, 'canal', 'notification', 'role', v_role);
  END IF;
  RETURN jsonb_build_object('ok', false, 'motif', 'destinataire introuvable');
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_admin_ecrire(text, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_admin_ecrire(text, uuid, uuid, uuid) TO authenticated;

-- Recherche d'une personne par son nom, pour l'admin (tous les rôles).
CREATE OR REPLACE FUNCTION public.steeve_admin_personnes(p_nom text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens text[] := array_remove(regexp_split_to_array(lower(trim(coalesce(p_nom, ''))), '\s+'), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF coalesce(array_length(v_tokens, 1), 0) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT p.id AS user_id, trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')) AS nom,
           (SELECT string_agg(r.role::text, ', ') FROM public.user_roles r WHERE r.user_id = p.id) AS roles,
           (SELECT c.id FROM public.clients c WHERE c.user_id = p.id LIMIT 1) AS client_id
      FROM public.profiles p
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_tokens) t WHERE position(t IN lower(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, ''))) = 0)
     ORDER BY p.nom NULLS LAST
     LIMIT 8) x);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_admin_personnes(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_admin_personnes(text) TO authenticated;

-- Recherche d'offres lancée par l'admin pour un client.
CREATE OR REPLACE FUNCTION public.admin_steeve_recherche_offres(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN public.steeve_demande_recherche_offres(p_client_id, 'admin', 'Demandée par l''admin à Steeve');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_recherche_offres(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_recherche_offres(uuid) TO authenticated;
