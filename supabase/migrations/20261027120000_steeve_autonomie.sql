-- Steeve autonome (consignes de l'administrateur du 26.10.2026) :
--  - réponses aux e-mails de VISITE seulement : créneau proposé par l'annonceur accepté, disponibilités demandées au
--    client puis transmises ; demande de visite d'un prospect pour une annonce Immo-Rama → créneaux publiés ;
--    aucune autre réponse sans l'accord de l'admin ;
--  - toutes les offres « intéressé » sans visite : demande de visite lancée par Steeve (balayage) ;
--  - postulation demandée (admin ou client) : dossier en tête de la file de la routine ChatGPT + alerte immédiate ;
--  - copilote : recherche d'une offre par adresse / référence / lien, critères d'un client, paiement reçu.

ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_kind_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_kind_check CHECK (kind = ANY (ARRAY[
  'demande_qr', 'relance_annonceur', 'envoi_dossier', 'triage_postulations', 'demande_postulation', 'lecon', 'lecture_mail',
  'demande_visite', 'reponse_offre', 'changement_criteres', 'demande_piece', 'reprise_dossier', 'recherche_offres',
  'envoi_piece_regie', 'inscription_visite', 'recherche_contact', 'action_client', 'reponse_annonceur', 'reponse_prospect']));

-- ---------- copilote : retrouver une offre (adresse, référence, lien, n° d'annonce) ----------
CREATE OR REPLACE FUNCTION public.admin_steeve_trouver_offre(p_recherche text, p_client text DEFAULT NULL, p_limite integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := lower(trim(coalesce(p_recherche, '')));
  v_num text := (regexp_match(coalesce(p_recherche, ''), '([0-9]{5,})'))[1];
  v_rue text;
  v_c text := lower(trim(coalesce(p_client, '')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF length(v_q) < 3 THEN
    RETURN jsonb_build_object('total', 0, 'liste', '[]'::jsonb, 'motif', 'recherche trop courte');
  END IF;
  -- « Ch. de Mochettaz 8c, 1030 Bussigny » → « mochettaz 8c » ; un lien Flatfox → son numéro d'annonce.
  v_rue := lower(trim(regexp_replace(split_part(v_q, ',', 1), '^(ch\.?|chemin|av\.?|avenue|rte|route|rue|pl\.?|place|bd|boulevard|allée|allee|impasse|quai|sentier|esp\.?)\s+(de la |de l''|des |du |de |d'')?', '')));
  RETURN (
    WITH m AS (
      SELECT o.id, o.client_id, o.adresse, o.prix, o.pieces, o.statut, o.lien_annonce, o.date_envoi, o.created_at,
             concat_ws(' ', p.prenom, p.nom) AS client
        FROM public.offres o
        LEFT JOIN public.clients c ON c.id = o.client_id
        LEFT JOIN public.profiles p ON p.id = c.user_id
       WHERE (
               (length(v_rue) >= 4 AND lower(o.adresse) LIKE '%' || v_rue || '%')
            OR lower(coalesce(o.lien_annonce, '')) LIKE '%' || v_q || '%'
            OR (v_num IS NOT NULL AND (coalesce(o.lien_annonce, '') LIKE '%' || v_num || '%'
                OR EXISTS (SELECT 1 FROM public.contacts_annonceurs ca WHERE ca.offre_id = o.id AND ca.reference LIKE '%' || v_num || '%')))
             )
         AND (v_c = '' OR lower(concat_ws(' ', p.prenom, p.nom)) LIKE '%' || v_c || '%')
    )
    SELECT jsonb_build_object('total', (SELECT count(*) FROM m), 'liste', coalesce(jsonb_agg(x ORDER BY x._t DESC), '[]'::jsonb))
      FROM (
        SELECT m.created_at AS _t, m.id AS offre_id, m.client_id, m.client, m.adresse, m.prix, m.pieces, m.statut, m.lien_annonce,
               to_char(coalesce(m.date_envoi, m.created_at) AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS envoyee_le,
               (SELECT jsonb_agg(jsonb_build_object('le', to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'), 'statut', v.statut) ORDER BY v.date_visite)
                  FROM public.visites v WHERE v.offre_id = m.id AND coalesce(v.statut, '') <> 'annulee') AS visites
          FROM m ORDER BY m.created_at DESC
         LIMIT least(greatest(coalesce(p_limite, 20), 1), 50)
      ) x
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_trouver_offre(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_trouver_offre(text, text, integer) TO authenticated, service_role;

-- ---------- copilote : critères d'un client (mêmes règles que pour le client) ----------
CREATE OR REPLACE FUNCTION public.admin_steeve_criteres(p_client_id uuid, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  r := public.steeve_client_criteres(p_client_id, p_changes);
  IF (r ->> 'ok')::boolean THEN
    UPDATE public.steeve_actions SET source = 'admin', requested_by = auth.uid(), note = 'Critères modifiés par l''admin (via Steeve)'
     WHERE id = (SELECT id FROM public.steeve_actions WHERE kind = 'changement_criteres' AND client_id = p_client_id ORDER BY created_at DESC LIMIT 1);
  END IF;
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_criteres(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_criteres(uuid, jsonb) TO authenticated, service_role;

-- ---------- copilote : paiement de l'acompte confirmé par l'admin (comme « Marquer payé » de Factures AbaNinja) ----------
CREATE OR REPLACE FUNCTION public.admin_steeve_paiement_recu(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT dm.id, dm.statut, dm.montant_acompte INTO d
    FROM public.clients c
    JOIN public.demandes_mandat dm ON dm.id = c.demande_mandat_id OR (c.demande_mandat_id IS NULL AND dm.user_id = c.user_id)
   WHERE c.id = p_client_id
   ORDER BY (dm.id = c.demande_mandat_id) DESC NULLS LAST, dm.created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'aucune demande de mandat pour ce client');
  END IF;
  IF d.statut <> 'en_attente' THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'statut', d.statut);
  END IF;
  UPDATE public.demandes_mandat SET statut = 'paye', date_paiement = now(), updated_at = now() WHERE id = d.id;
  INSERT INTO public.steeve_actions (kind, canal, source, requested_by, client_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('action_client', 'app', 'admin', auth.uid(), p_client_id, 'fait', 'humain', 'Acompte marqué payé par l''admin (via Steeve)', now(), 'admin',
          'paiement:' || d.id, jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')))
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'deja', false, 'acompte_chf', d.montant_acompte,
    'suite', 'Demande de mandat marquée payée. L''activation du compte (création, contrat, bienvenue) se fait dans « Demandes d''activation » si le compte n''est pas encore actif.');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_paiement_recu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_paiement_recu(uuid) TO authenticated, service_role;

-- ---------- postulation demandée : en tête de la file ChatGPT + alerte immédiate ----------
CREATE OR REPLACE FUNCTION public.steeve_postulation_urgente(p_offre_id uuid, p_client_id uuid, p_par text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j record;
  o record;
  v_nom text;
  a record;
BEGIN
  SELECT id, status INTO j FROM public.postulation_jobs WHERE offre_id = p_offre_id AND client_id = p_client_id;
  IF NOT FOUND OR j.status = 'completed' OR public.steeve_dossier_deja_envoye(p_offre_id, p_client_id) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'aucune préparation en cours pour ce dossier');
  END IF;
  UPDATE public.postulation_jobs SET priority = 'urgent', updated_at = now() WHERE id = j.id AND coalesce(priority, '') <> 'urgent';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'job', j.status);
  END IF;
  SELECT adresse INTO o FROM public.offres WHERE id = p_offre_id;
  SELECT concat_ws(' ', p.prenom, p.nom) INTO v_nom FROM public.clients c JOIN public.profiles p ON p.id = c.user_id WHERE c.id = p_client_id;
  FOR a IN SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, read, metadata)
    VALUES (a.user_id, 'surveillance_alerte', 'Postulation à préparer maintenant',
            left(coalesce(v_nom, 'Client') || ' — ' || coalesce(o.adresse, 'bien') || ' : demandée ' || CASE WHEN p_par = 'admin' THEN 'par toi' ELSE 'par le client' END ||
                 '. Le dossier est en tête de la file : lance la routine Postulation dans ChatGPT (préparation du formulaire et du dossier complet). Steeve contrôle et envoie ensuite.', 600),
            '/admin/postulations', false, jsonb_build_object('cle', 'postulation-urgente-' || j.id, 'niveau', 'urgent', 'par', 'steeve'));
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'deja', false, 'job', j.status);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_postulation_urgente(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_postulation_urgente(uuid, uuid, text) TO service_role;

-- Copilote : postulation demandée par l'admin (mêmes règles que le bouton « Postuler » du client), puis urgente.
CREATE OR REPLACE FUNCTION public.admin_steeve_postuler(p_offre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT id, client_id, adresse INTO o FROM public.offres WHERE id = p_offre_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  IF public.steeve_dossier_deja_envoye(o.id, o.client_id) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Dossier déjà envoyé pour ce bien (preuve_envoi pour le détail).');
  END IF;
  BEGIN
    r := public.steeve_request_postulation(o.client_id, o.id);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'motif', SQLERRM);
  END;
  RETURN jsonb_build_object('ok', true, 'bien', o.adresse, 'client_id', o.client_id, 'postulation', r,
                            'urgence', public.steeve_postulation_urgente(o.id, o.client_id, 'admin'));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_postuler(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_postuler(uuid) TO authenticated, service_role;

-- ---------- balayage : offres « intéressé » sans visite ni demande → demande de visite ----------
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
     WHERE f.statut IN ('interesse', 'souhaite_postuler', 'visite_planifiee')
       AND coalesce(f.interesse_notified_at, f.updated_at) > now() - interval '21 days'
       AND public.steeve_client_servi(f.client_id)
       AND NOT EXISTS (SELECT 1 FROM public.visites v WHERE v.offre_id = f.id AND v.client_id = f.client_id AND coalesce(v.statut, '') NOT IN ('annulee', 'refusee'))
       AND NOT EXISTS (SELECT 1 FROM public.steeve_actions a WHERE a.offre_id = f.id AND a.kind IN ('demande_visite', 'inscription_visite', 'recherche_contact')
                         AND a.statut NOT IN ('annule', 'echec', 'bloque_acces'))
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

-- ---------- disponibilités du client transmises à l'annonceur ----------
CREATE OR REPLACE FUNCTION public.steeve_client_disponibilites(p_client_id uuid, p_offre_id uuid, p_texte text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  o record;
  v_txt text := left(nullif(trim(p_texte), ''), 400);
BEGIN
  IF v_txt IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Disponibilités vides.');
  END IF;
  SELECT id, canal, controles INTO t FROM public.steeve_actions
   WHERE kind = 'reponse_annonceur' AND offre_id = p_offre_id AND client_id = p_client_id AND statut = 'en_attente_client'
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Aucun annonceur n''attend ses disponibilités pour ce bien : propose plutôt une demande de visite.');
  END IF;
  SELECT adresse INTO o FROM public.offres WHERE id = p_offre_id;
  UPDATE public.steeve_actions
     SET statut = 'a_faire', updated_at = now(), derniere_activite = now(),
         corps = 'Bonjour,' || E'\n\n' || 'Merci pour votre retour au sujet de ' || coalesce(o.adresse, 'votre objet') || '. Notre client est disponible pour une visite : '
                 || v_txt || '.' || E'\n\n' || 'Pourriez-vous nous confirmer le créneau qui vous convient ?' || E'\n\n' || 'Merci d''avance et belle journée,' || E'\n'
                 || 'Immo-rama.ch – Relocation' || E'\n' || 'visites@immo-rama.ch · 021 634 31 61',
         controles = coalesce(controles, '{}'::jsonb) || jsonb_build_object('disponibilites', v_txt),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'disponibilites_client'))
   WHERE id = t.id;
  RETURN jsonb_build_object('ok', true, 'bien', o.adresse, 'canal', t.canal);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_disponibilites(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_disponibilites(uuid, uuid, text) TO service_role;

-- ---------- prospects : demandes de visite pour une annonce Immo-Rama publiée ----------
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
  )
  SELECT coalesce(jsonb_agg(x ORDER BY x.received_at), '[]'::jsonb) FROM (
    SELECT mails.*, a.id AS annonce_id, a.reference, a.slug, a.titre, a.adresse AS annonce_adresse, a.ville
      FROM mails
      JOIN LATERAL (
        SELECT a.* FROM ann a
         WHERE (a.reference IS NOT NULL AND (mails.subject ILIKE '%' || a.reference || '%' OR mails.body_text ILIKE '%' || a.reference || '%'))
            OR (a.slug IS NOT NULL AND mails.body_text ILIKE '%' || a.slug || '%')
            OR (length(a.rue) >= 8 AND (lower(coalesce(mails.subject, '')) LIKE '%' || a.rue || '%' OR lower(mails.body_text) LIKE '%' || a.rue || '%'))
         LIMIT 2
      ) a ON true
     WHERE NOT EXISTS (SELECT 1 FROM public.steeve_actions sa WHERE sa.idempotency_key IN ('prospect:' || mails.id::text, 'blanc:prospect:' || mails.id::text))
       -- Une seule annonce reconnue, sinon l'équipe tranche.
       AND (SELECT count(*) FROM ann a2 WHERE (a2.reference IS NOT NULL AND (mails.subject ILIKE '%' || a2.reference || '%' OR mails.body_text ILIKE '%' || a2.reference || '%'))
             OR (a2.slug IS NOT NULL AND mails.body_text ILIKE '%' || a2.slug || '%')
             OR (length(a2.rue) >= 8 AND (lower(coalesce(mails.subject, '')) LIKE '%' || a2.rue || '%' OR lower(mails.body_text) LIKE '%' || a2.rue || '%'))) = 1
     ORDER BY mails.received_at
     LIMIT least(greatest(coalesce(p_limit, 5), 1), 20)
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_mail_prospects(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_mail_prospects(integer) TO service_role;

-- Créneaux de visite publiés d'une annonce Immo-Rama (futurs, actifs, avec de la place).
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
     AND c.date_heure < now() + interval '30 days';
$$;
REVOKE ALL ON FUNCTION public.steeve_annonce_creneaux(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_annonce_creneaux(uuid) TO service_role;

-- Copilote : réponse de visite restée « à valider » (doute de Steeve) envoyée sur décision de l'admin, texte corrigé ou non.
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
  UPDATE public.steeve_actions
     SET statut = 'a_faire', motif = NULL, requested_by = auth.uid(), updated_at = now(),
         corps = coalesce(left(nullif(trim(p_corps), ''), 4000), corps),
         controles = coalesce(controles, '{}'::jsonb) || jsonb_build_object('valide_admin', true, 'valide_le', now()),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'valide_admin'))
   WHERE id = p_action_id;
  RETURN jsonb_build_object('ok', true, 'destinataire', t.destinataire, 'objet', t.objet,
                            'suite', 'Steeve l''envoie depuis visites@ à son prochain passage (dans la minute, entre 7 h et 20 h).');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_valider_reponse(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_valider_reponse(uuid, text) TO authenticated, service_role;

-- Copilote : réponses de visite en attente (à valider, ou en attente des disponibilités du client).
CREATE OR REPLACE FUNCTION public.admin_steeve_reponses_visite(p_limite integer DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(x ORDER BY x._t DESC), '[]'::jsonb) FROM (
    SELECT a.id AS action_id, a.created_at AS _t, a.kind, a.statut, a.canal, a.destinataire, a.objet, left(a.corps, 1200) AS corps, a.motif, a.note,
           o.adresse AS bien, (SELECT concat_ws(' ', p.prenom, p.nom) FROM public.clients c JOIN public.profiles p ON p.id = c.user_id WHERE c.id = a.client_id) AS client,
           to_char(a.created_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS le
      FROM public.steeve_actions a LEFT JOIN public.offres o ON o.id = a.offre_id
     WHERE a.kind IN ('reponse_annonceur', 'reponse_prospect') AND a.statut IN ('a_valider', 'bloque', 'en_attente_client', 'a_faire')
       AND a.created_at > now() - interval '14 days'
     ORDER BY a.created_at DESC LIMIT least(greatest(coalesce(p_limite, 15), 1), 40)) x);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_reponses_visite(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_reponses_visite(integer) TO authenticated, service_role;

-- ---------- routine Chrome : S9, réponse à l'annonceur dans le chat Flatfox (appliqué avec sauvegarde surveillance_chrome_sauvegarde_20261026e) ----------
INSERT INTO public.routine_config (cle, valeur, description, updated_at)
SELECT 'surveillance_chrome_sauvegarde_20261026e', valeur, 'Sauvegarde avant S9 (réponse à l''annonceur)', now() FROM public.routine_config WHERE cle = 'surveillance_chrome'
ON CONFLICT (cle) DO NOTHING;
UPDATE public.routine_config SET valeur = replace(replace(valeur,
  'ARRAY[''demande_qr'',''demande_visite'',''inscription_visite'',''recherche_contact'']',
  'ARRAY[''demande_qr'',''demande_visite'',''inscription_visite'',''recherche_contact'',''reponse_annonceur'']'),
  E'FORMULAIRE REÇU :',
  E'S9 RÉPONSE À L''ANNONCEUR (kind ''reponse_annonceur'', canal ''flatfox'') : confirmation d''un créneau de visite proposé par l''annonceur, ou disponibilités du client qu''il a demandées. Après S1 et S2, ouvre le chat Flatfox de l''annonce exacte (lien_annonce, même adresse et même numéro de rue) et envoie le champ corps TEL QUEL (n''ajoute ni ne retire rien ; s''il contient « à compléter », un champ <…> ou une note interne → n''envoie rien, ''bloque''). Juste avant d''envoyer : SELECT steeve_tache_etape(ID, JETON, ''envoi_flatfox'', false, NULL, NULL) ; après l''envoi, vérifie que le message apparaît, puis SELECT steeve_tache_terminer(ID, JETON, ''fait'', ''chat Flatfox <JJ.MM.AAAA HHhMM>'', NULL, NULL). Si l''annonceur a proposé un bouton de confirmation de visite dans le chat pour le créneau indiqué dans corps, clique-le une seule fois. Chat introuvable ou doute → ''bloque'' avec la raison ; session expirée ou captcha → ''bloque_acces''.\nFORMULAIRE REÇU :'),
  updated_at = now()
WHERE cle = 'surveillance_chrome' AND position('S9 RÉPONSE À L''ANNONCEUR' in valeur) = 0;
