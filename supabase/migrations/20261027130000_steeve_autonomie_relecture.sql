-- Steeve autonomie : corrections après relecture indépendante (aucun e-mail en double, déjà répondu, mauvais portail,
-- créneaux complets, balayage qui relançait des demandes annulées).

-- ---------- balayage : jamais une demande déjà faite, annulée ou en échec ; offres « intéressé » seulement ----------
CREATE OR REPLACE FUNCTION public.steeve_balayage_visites(p_limit integer DEFAULT 8)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  r jsonb;
  n integer := 0;
  v_jour integer;
  v_out jsonb := '[]'::jsonb;
BEGIN
  -- Plafond : 60 demandes automatiques par jour (heure suisse).
  SELECT count(*) INTO v_jour FROM public.steeve_actions
   WHERE kind = 'demande_visite' AND source = 'auto' AND note LIKE 'Intérêt du client sans visite%'
     AND created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  IF v_jour >= 60 THEN
    RETURN jsonb_build_object('demandes', 0, 'plafond', true);
  END IF;
  FOR o IN
    SELECT f.id, f.client_id FROM public.offres f
     WHERE f.statut IN ('interesse', 'souhaite_postuler')
       AND coalesce(f.interesse_notified_at, f.updated_at) > now() - interval '21 days'
       AND public.steeve_client_servi(f.client_id)
       AND NOT EXISTS (SELECT 1 FROM public.visites v WHERE v.offre_id = f.id AND coalesce(v.statut, '') NOT IN ('annulee', 'refusee'))
       -- Toute demande existante, quel que soit son état (une demande annulée par l'équipe ou en échec n'est jamais relancée
       -- ici : steeve_tache_creer remettrait la même ligne « à faire »).
       AND NOT EXISTS (SELECT 1 FROM public.steeve_actions a WHERE a.offre_id = f.id AND a.kind IN ('demande_visite', 'inscription_visite', 'recherche_contact', 'relance_annonceur')
                         AND a.statut <> 'a_blanc')
       AND NOT EXISTS (SELECT 1 FROM public.contacts_annonceurs ca WHERE ca.offre_id = f.id AND ca.envoye_le > now() - interval '30 days')
     ORDER BY coalesce(f.interesse_notified_at, f.updated_at) DESC
     LIMIT least(greatest(coalesce(p_limit, 8), 1), 60 - v_jour)
  LOOP
    r := public.steeve_client_demande_visite(o.client_id, o.id, NULL);
    IF (r ->> 'ok')::boolean AND (r ->> 'id') IS NOT NULL AND NOT coalesce((r ->> 'existante')::boolean, false) THEN
      UPDATE public.steeve_actions SET source = 'auto', note = 'Intérêt du client sans visite : demande lancée par Steeve' WHERE id = (r ->> 'id')::uuid;
      n := n + 1;
      v_out := v_out || jsonb_build_array(jsonb_build_object('offre_id', o.id, 'canal', r ->> 'canal'));
    END IF;
  END LOOP;
  RETURN jsonb_build_object('demandes', n, 'detail', v_out);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_balayage_visites(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_balayage_visites(integer) TO service_role;

-- ---------- un e-mail reçu a-t-il déjà une réponse de l'équipe (dossier « Envoyés » des boîtes de l'application) ? ----------
CREATE OR REPLACE FUNCTION public.steeve_mail_deja_repondu(p_mail_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH src AS (
    SELECT m.message_id AS mid, lower(coalesce(m.from_email, '')) AS de, coalesce(m.internal_date, m.sent_at) AS recu
      FROM public.mail_messages m WHERE m.id = p_mail_id
    UNION ALL
    SELECT e.message_key, lower(coalesce(e.from_email, '')), e.received_at
      FROM public.mailbox_emails e WHERE e.id = p_mail_id
  )
  SELECT EXISTS (
    SELECT 1 FROM src
      JOIN public.mail_messages r ON coalesce(r.internal_date, r.sent_at) >= src.recu
      JOIN public.mail_folders f ON f.id = r.folder_id AND f.role = 'sent'
     WHERE (nullif(src.mid, '') IS NOT NULL AND (r.in_reply_to = src.mid OR coalesce(r.references_header, '') LIKE '%' || src.mid || '%'))
        OR (src.de LIKE '%@%' AND r.to_list::text ILIKE '%' || src.de || '%')
  );
$$;
REVOKE ALL ON FUNCTION public.steeve_mail_deja_repondu(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_mail_deja_repondu(uuid) TO service_role;

-- ---------- prospects : rue avec numéro, référence assez longue, pas déjà répondu par l'équipe ----------
CREATE OR REPLACE FUNCTION public.steeve_mail_prospects(p_limit integer DEFAULT 5)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ann AS (
    SELECT ap.id, ap.reference, ap.slug, ap.titre, ap.adresse, ap.ville, ap.type_transaction,
           lower(trim(split_part(ap.adresse, ',', 1))) AS rue
      FROM public.annonces_publiques ap
     WHERE ap.statut = 'publie' AND (ap.source = 'immo-rama.ch' OR lower(coalesce(ap.email_contact, '')) LIKE '%@immo-rama.ch' OR lower(coalesce(ap.email_contact, '')) LIKE '%@logisorama.ch')
  ), mails AS (
    SELECT m.id, s.address AS mailbox, lower(m.from_email) AS from_email, m.from_name, m.reply_to::text AS reply_to, m.subject,
           left(coalesce(m.body_text, m.snippet), 6000) AS body_text, coalesce(m.internal_date, m.sent_at) AS received_at
      FROM public.mail_messages m
      JOIN public.shared_mailboxes s ON s.id = m.mailbox_id
      LEFT JOIN public.mail_folders f ON f.id = m.folder_id
     WHERE s.address IN ('info@immo-rama.ch', 'visites@immo-rama.ch', 'relocation@immo-rama.ch', 'support@logisorama.ch')
       AND coalesce(f.role, 'inbox') = 'inbox'
       AND coalesce(m.internal_date, m.sent_at) > now() - interval '3 days'
       AND NOT coalesce(m.is_draft, false)
       AND lower(m.from_email) NOT LIKE '%@immo-rama.ch' AND lower(m.from_email) NOT LIKE '%@logisorama.ch'
  ), lien AS (
    SELECT mails.id AS mail_id, a.id AS annonce_id
      FROM mails JOIN ann a ON
           (length(coalesce(a.reference, '')) >= 6 AND (mails.subject ILIKE '%' || a.reference || '%' OR mails.body_text ILIKE '%' || a.reference || '%'))
        OR (length(coalesce(a.slug, '')) >= 8 AND mails.body_text ILIKE '%' || a.slug || '%')
        -- Adresse seulement avec le numéro de rue (« avenue de la gare » seule ne suffit pas).
        OR (length(a.rue) >= 8 AND a.rue ~ '[0-9]' AND (lower(coalesce(mails.subject, '')) LIKE '%' || a.rue || '%' OR lower(mails.body_text) LIKE '%' || a.rue || '%'))
  )
  SELECT coalesce(jsonb_agg(x ORDER BY x.received_at), '[]'::jsonb) FROM (
    SELECT mails.*, a.id AS annonce_id, a.reference, a.slug, a.titre, a.adresse AS annonce_adresse, a.ville,
           public.steeve_mail_deja_repondu(mails.id) AS deja_repondu
      FROM mails
      JOIN lien l ON l.mail_id = mails.id
      JOIN ann a ON a.id = l.annonce_id
     WHERE NOT EXISTS (SELECT 1 FROM public.steeve_actions sa WHERE sa.idempotency_key IN ('prospect:' || mails.id::text, 'blanc:prospect:' || mails.id::text))
       -- Une seule annonce reconnue, sinon l'équipe tranche.
       AND (SELECT count(DISTINCT l2.annonce_id) FROM lien l2 WHERE l2.mail_id = mails.id) = 1
     ORDER BY mails.received_at
     LIMIT least(greatest(coalesce(p_limit, 5), 1), 20)
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_mail_prospects(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_mail_prospects(integer) TO service_role;

-- ---------- créneaux publiés : seulement ceux qui ont encore de la place ----------
CREATE OR REPLACE FUNCTION public.steeve_annonce_creneaux(p_annonce_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('debut', c.date_heure,
           'label', to_char(c.date_heure AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY "à" HH24"h"MI')) ORDER BY c.date_heure), '[]'::jsonb)
    FROM public.annonce_creneaux c
   WHERE c.annonce_id = p_annonce_id AND coalesce(c.actif, true) AND c.date_heure > now() + interval '3 hours'
     AND c.date_heure < now() + interval '30 days'
     AND (c.capacite_max IS NULL OR
          (SELECT count(*) FROM public.candidatures_location cl WHERE cl.creneau_id = c.id AND coalesce(cl.statut, '') <> 'desiste') < c.capacite_max);
$$;
REVOKE ALL ON FUNCTION public.steeve_annonce_creneaux(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_annonce_creneaux(uuid) TO service_role;

-- ---------- disponibilités : jours et heures seulement ; portail sans chat automatique → l'équipe ----------
CREATE OR REPLACE FUNCTION public.steeve_client_disponibilites(p_client_id uuid, p_offre_id uuid, p_texte text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  o record;
  a record;
  v_txt text := left(nullif(trim(p_texte), ''), 400);
  v_humain boolean;
BEGIN
  IF v_txt IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Disponibilités vides.');
  END IF;
  IF v_txt ~* '(https?://|www\.|@|[0-9]{3}[ .]?[0-9]{3}[ .]?[0-9]{2}|[<>\[\]{}])' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Seulement les jours et heures de disponibilité du client (aucune adresse, lien ou numéro).');
  END IF;
  SELECT id, canal, responsable, controles INTO t FROM public.steeve_actions
   WHERE kind = 'reponse_annonceur' AND offre_id = p_offre_id AND client_id = p_client_id AND statut = 'en_attente_client'
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Aucun annonceur n''attend ses disponibilités pour ce bien : propose plutôt une demande de visite.');
  END IF;
  v_humain := t.responsable = 'humain';
  SELECT adresse INTO o FROM public.offres WHERE id = p_offre_id;
  UPDATE public.steeve_actions
     SET statut = CASE WHEN v_humain THEN 'a_valider' ELSE 'a_faire' END,
         motif = CASE WHEN v_humain THEN 'Disponibilités du client à transmettre sur le portail de l''annonceur (pas de chat automatique).' ELSE motif END,
         updated_at = now(), derniere_activite = now(),
         corps = 'Bonjour,' || E'\n\n' || 'Merci pour votre retour au sujet de ' || coalesce(o.adresse, 'votre objet') || '. Notre client est disponible pour une visite : '
                 || v_txt || '.' || E'\n\n' || 'Pourriez-vous nous confirmer le créneau qui vous convient ?' || E'\n\n' || 'Merci d''avance et belle journée,' || E'\n'
                 || 'Immo-rama.ch – Relocation' || E'\n' || 'visites@immo-rama.ch · 021 634 31 61',
         controles = coalesce(controles, '{}'::jsonb) || jsonb_build_object('disponibilites', v_txt),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'disponibilites_client'))
   WHERE id = t.id;
  IF v_humain THEN
    FOR a IN SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link, read, metadata)
      VALUES (a.user_id, 'surveillance_alerte', 'Disponibilités à transmettre sur le portail',
              left(coalesce(o.adresse, 'Bien') || ' : le client est disponible ' || v_txt || '. À transmettre à l''annonceur sur son portail.', 600),
              '/admin/steeve', false, jsonb_build_object('cle', 'steeve-dispo-' || t.id, 'niveau', 'urgent', 'par', 'steeve'));
    END LOOP;
  END IF;
  RETURN jsonb_build_object('ok', true, 'bien', o.adresse, 'canal', t.canal, 'par_equipe', v_humain);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_disponibilites(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_disponibilites(uuid, uuid, text) TO service_role;

-- ---------- validation par l'admin : seulement e-mail (Steeve) ou chat Flatfox (routine) ----------
CREATE OR REPLACE FUNCTION public.admin_steeve_valider_reponse(p_action_id uuid, p_corps text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT id, kind, statut, canal, destinataire, objet INTO t FROM public.steeve_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR t.kind NOT IN ('reponse_annonceur', 'reponse_prospect') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'réponse introuvable');
  END IF;
  IF t.statut NOT IN ('a_valider', 'bloque') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'réponse déjà traitée (' || t.statut || ')');
  END IF;
  IF t.canal NOT IN ('email', 'flatfox') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Réponse à faire sur le portail de l''annonceur (immobilier.ch, Homegate…) : ni Steeve ni la routine ne peuvent l''envoyer.');
  END IF;
  IF t.canal = 'email' AND coalesce(t.destinataire, '') !~* '^[^@\s<>]+@[^@\s<>]+\.[a-z]{2,}$' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Aucune adresse de réponse fiable : réponds toi-même depuis la boîte.');
  END IF;
  UPDATE public.steeve_actions
     SET statut = 'a_faire', motif = NULL, requested_by = auth.uid(), updated_at = now(),
         corps = coalesce(left(nullif(trim(p_corps), ''), 4000), corps),
         controles = coalesce(controles, '{}'::jsonb) || jsonb_build_object('valide_admin', true, 'valide_le', now()),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'valide_admin'))
   WHERE id = p_action_id;
  RETURN jsonb_build_object('ok', true, 'destinataire', t.destinataire, 'objet', t.objet,
                            'suite', CASE WHEN t.canal = 'flatfox' THEN 'La routine Chrome l''envoie dans le chat Flatfox à son prochain passage.'
                                          ELSE 'Steeve l''envoie depuis visites@ à son prochain passage (entre 7 h et 20 h).' END);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_valider_reponse(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_valider_reponse(uuid, text) TO authenticated, service_role;
