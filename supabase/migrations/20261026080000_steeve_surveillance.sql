-- Steeve reprend la routine Surveillance (lot 9) : ce qu'elle vérifiait 4 fois par jour, Steeve le vérifie à
-- chaque passage de l'opérateur (toutes les 5 minutes, messages aux clients entre 8 h et 20 h).
-- Cette fonction ne fait que LIRE et renvoyer les cas à traiter, section par section (mêmes règles que la
-- routine) ; Steeve (operator.ts → surveillance.ts) écrit au client, alerte l'équipe ou met à jour.
-- Les sujets sensibles restent humains : mandat, paiements, factures, remboursements, signature du bail, litiges.
-- Additive et idempotente.

ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_kind_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_kind_check CHECK (kind IN (
  'demande_qr', 'relance_annonceur', 'envoi_dossier', 'triage_postulations', 'demande_postulation', 'lecon', 'lecture_mail',
  'demande_visite', 'reponse_offre', 'changement_criteres', 'demande_piece', 'reprise_dossier',
  'recherche_offres', 'envoi_piece_regie', 'surveillance', 'relance_bail'));

-- Clients servis : statut actif ou en attente, compteur non arrêté.
CREATE OR REPLACE FUNCTION public.steeve_clients_servis()
RETURNS TABLE (id uuid, user_id uuid, prenom text, nom text, last_seen timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.user_id, p.prenom, p.nom, p.last_seen_at
    FROM public.clients c LEFT JOIN public.profiles p ON p.id = c.user_id
   WHERE c.statut IN ('actif', 'en_attente')
     AND NOT EXISTS (SELECT 1 FROM public.user_credits uc WHERE uc.user_id = c.user_id AND uc.mandat_statut IN ('aucun', 'expire', 'suspendu'));
$$;
REVOKE ALL ON FUNCTION public.steeve_clients_servis() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_clients_servis() TO service_role;

CREATE OR REPLACE FUNCTION public.steeve_surveillance(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (p_now AT TIME ZONE 'Europe/Zurich')::date;
  v_res jsonb := '{}'::jsonb;
BEGIN
  -- B — visites d'aujourd'hui (à venir) et de demain.
  v_res := v_res || jsonb_build_object('b_visites', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT v.id, v.offre_id, v.client_id, v.date_visite, coalesce(nullif(v.adresse, ''), o.adresse) AS adresse, o.statut AS offre_statut,
           v.est_deleguee, v.coursier_id, v.statut_coursier, sc.prenom,
           (coalesce(nullif(v.adresse, ''), o.adresse) IS NULL OR trim(coalesce(nullif(v.adresse, ''), o.adresse)) = '') AS adresse_vide,
           EXISTS (SELECT 1 FROM public.visites v2 WHERE v2.client_id = v.client_id AND v2.id <> v.id AND coalesce(v2.statut, '') <> 'annulee'
                   AND abs(extract(epoch FROM v2.date_visite - v.date_visite)) < 90 * 60) AS conflit
      FROM public.visites v
      JOIN public.steeve_clients_servis() sc ON sc.id = v.client_id
      LEFT JOIN public.offres o ON o.id = v.offre_id
     WHERE coalesce(v.statut, '') NOT IN ('annulee', 'effectuee')
       AND v.date_visite > p_now
       AND (v.date_visite AT TIME ZONE 'Europe/Zurich')::date <= v_today + 1
       AND (o.statut IN ('interesse', 'visite_planifiee', 'souhaite_postuler', 'envoyee', 'vue') OR v.est_deleguee OR v.client_confirme_visite_at IS NOT NULL)
     ORDER BY v.date_visite LIMIT 100) x));

  -- C1 — questions de clients sans réponse depuis plus de 4 h (conversations reprises par un agent).
  v_res := v_res || jsonb_build_object('c_sans_reponse', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT c.id AS conversation_id, c.client_id, last_m.created_at AS depuis, left(last_m.content, 160) AS extrait
      FROM public.conversations c
      JOIN LATERAL (SELECT m.sender_type, m.created_at, m.content FROM public.messages m
                     WHERE m.conversation_id = c.id AND NOT coalesce(m.masque_messagerie, false)
                     ORDER BY m.created_at DESC LIMIT 1) last_m ON true
     WHERE c.conversation_type = 'client-agent' AND NOT coalesce(c.is_archived, false) AND coalesce(c.handled_by, 'agent') = 'agent'
       AND last_m.sender_type = 'client' AND last_m.created_at < p_now - interval '4 hours' AND last_m.created_at > p_now - interval '7 days'
     ORDER BY last_m.created_at LIMIT 50) x));

  -- C2 — nouveaux leads et demandes de mandat à traiter (24 dernières heures).
  v_res := v_res || jsonb_build_object('c_leads', jsonb_build_object(
    'leads', (SELECT coalesce(jsonb_agg(trim(coalesce(prenom, '') || ' ' || coalesce(nom, ''))), '[]'::jsonb) FROM (
               SELECT prenom, nom FROM public.leads WHERE NOT coalesce(contacted, false) AND created_at > p_now - interval '24 hours' ORDER BY created_at DESC LIMIT 20) l),
    'meta', (SELECT coalesce(jsonb_agg(full_name), '[]'::jsonb) FROM (
               SELECT full_name FROM public.meta_leads WHERE coalesce(lead_status, '') IN ('', 'nouveau', 'new') AND created_at > p_now - interval '24 hours' ORDER BY created_at DESC LIMIT 20) m),
    'mandats', (SELECT coalesce(jsonb_agg(trim(coalesce(prenom, '') || ' ' || coalesce(nom, ''))), '[]'::jsonb) FROM (
               SELECT prenom, nom FROM public.demandes_mandat WHERE processed_at IS NULL AND created_at > p_now - interval '24 hours' ORDER BY created_at DESC LIMIT 20) d)));

  -- D1 — offres sans réponse (envoyées depuis 24 h à 72 h) : rappel à 24 h puis à 48 h, regroupés par client.
  v_res := v_res || jsonb_build_object('d_offres', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT o.id, o.client_id, sc.prenom, o.adresse, o.prix, o.date_envoi,
           CASE WHEN o.date_envoi < p_now - interval '48 hours' THEN 48 ELSE 24 END AS palier
      FROM public.offres o JOIN public.steeve_clients_servis() sc ON sc.id = o.client_id
     WHERE o.statut IN ('envoyee', 'vue') AND o.date_envoi < p_now - interval '24 hours' AND o.date_envoi > p_now - interval '72 hours'
     ORDER BY o.client_id, o.date_envoi LIMIT 300) x));
  v_res := v_res || jsonb_build_object('d_beaucoup', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT o.client_id, sc.prenom, sc.nom, count(*) AS n
      FROM public.offres o JOIN public.steeve_clients_servis() sc ON sc.id = o.client_id
     WHERE o.statut IN ('envoyee', 'vue') AND o.date_envoi < p_now - interval '72 hours' AND o.date_envoi > p_now - interval '30 days'
     GROUP BY o.client_id, sc.prenom, sc.nom HAVING count(*) >= 5 LIMIT 50) x));

  -- D2 — clients inactifs avec des offres en attente.
  v_res := v_res || jsonb_build_object('d_inactifs', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT sc.id AS client_id, sc.prenom, sc.nom, sc.last_seen,
           (SELECT count(*) FROM public.offres o WHERE o.client_id = sc.id AND o.statut IN ('envoyee', 'vue')) AS en_attente
      FROM public.steeve_clients_servis() sc
     WHERE sc.last_seen IS NOT NULL AND sc.last_seen < p_now - interval '48 hours'
       AND EXISTS (SELECT 1 FROM public.offres o WHERE o.client_id = sc.id AND o.statut IN ('envoyee', 'vue') AND o.date_envoi > p_now - interval '14 days')
     LIMIT 100) x));

  -- D3 — pièces du dossier (clients avec un intérêt en cours) : identité, 3 fiches de salaire récentes, poursuites < 3 mois.
  v_res := v_res || jsonb_build_object('d_pieces', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT sc.id AS client_id, sc.prenom,
           array_remove(ARRAY[
             CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d WHERE d.client_id = sc.id AND d.candidate_id IS NULL AND d.type_document IN ('piece_identite', 'permis_sejour'))
                  THEN 'pièce d''identité ou permis de séjour' END,
             CASE WHEN (SELECT count(*) FROM public.documents d WHERE d.client_id = sc.id AND d.candidate_id IS NULL AND d.type_document = 'fiche_salaire'
                         AND coalesce(d.date_upload, d.created_at) > p_now - interval '100 days') < 3
                    OR NOT EXISTS (SELECT 1 FROM public.documents d WHERE d.client_id = sc.id AND d.candidate_id IS NULL AND d.type_document = 'fiche_salaire'
                         AND coalesce(d.date_upload, d.created_at) > p_now - interval '45 days')
                  THEN '3 dernières fiches de salaire' END,
             CASE WHEN coalesce(cl.extrait_poursuites_date_emission::timestamptz,
                               (SELECT max(coalesce(d.date_upload, d.created_at)) FROM public.documents d WHERE d.client_id = sc.id AND d.candidate_id IS NULL AND d.type_document = 'extrait_poursuites'))
                       IS NULL
                    OR coalesce(cl.extrait_poursuites_date_emission::timestamptz,
                               (SELECT max(coalesce(d.date_upload, d.created_at)) FROM public.documents d WHERE d.client_id = sc.id AND d.candidate_id IS NULL AND d.type_document = 'extrait_poursuites'))
                       < p_now - interval '92 days'
                  THEN 'extrait des poursuites de moins de 3 mois' END
           ], NULL) AS manquantes
      FROM public.steeve_clients_servis() sc JOIN public.clients cl ON cl.id = sc.id
     WHERE EXISTS (SELECT 1 FROM public.offres o WHERE o.client_id = sc.id AND o.statut IN ('interesse', 'visite_planifiee', 'visite_effectuee', 'souhaite_postuler'))
     LIMIT 200) x WHERE cardinality(x.manquantes) > 0));

  -- E4 — dossier pas encore parti 24 h après la demande de postuler.
  v_res := v_res || jsonb_build_object('e_non_partis', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT o.id AS offre_id, o.client_id, sc.prenom, sc.nom, o.adresse, coalesce(o.postulation_demandee_at, o.updated_at) AS depuis,
           (SELECT j.status FROM public.postulation_jobs j WHERE j.offre_id = o.id AND j.client_id = o.client_id LIMIT 1) AS job
      FROM public.offres o JOIN public.steeve_clients_servis() sc ON sc.id = o.client_id
     WHERE o.statut IN ('souhaite_postuler', 'demande_postulation')
       AND coalesce(o.postulation_demandee_at, o.updated_at) < p_now - interval '24 hours'
       AND NOT public.steeve_dossier_deja_envoye(o.id, o.client_id)
     LIMIT 100) x));
  -- E5 — candidature sans nouvelle de la régie depuis 5 jours.
  v_res := v_res || jsonb_build_object('e_sans_nouvelle', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT ca.id, ca.offre_id, ca.client_id, sc.prenom, sc.nom, o.adresse, ca.date_depot
      FROM public.candidatures ca JOIN public.steeve_clients_servis() sc ON sc.id = ca.client_id LEFT JOIN public.offres o ON o.id = ca.offre_id
     WHERE ca.statut = 'en_attente' AND coalesce(ca.date_depot, ca.created_at) < p_now - interval '5 days' AND ca.updated_at < p_now - interval '5 days'
     LIMIT 100) x));

  -- F2 — annonceur relancé sans réponse depuis 48 h → sans suite, appel à faire.
  v_res := v_res || jsonb_build_object('f_sans_suite', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT ca.id, ca.offre_id, ca.client_id, ca.adresse, ca.annonceur, ca.annonceur_email
      FROM public.contacts_annonceurs ca
     WHERE ca.statut = 'relance' AND ca.reponse_le IS NULL AND ca.relance_le < p_now - interval '48 hours'
     LIMIT 100) x));
  -- F3 — intérêt sans visite depuis 3 jours (offres de moins de 21 jours).
  v_res := v_res || jsonb_build_object('f_interet', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT o.id AS offre_id, o.client_id, sc.prenom, o.adresse
      FROM public.offres o JOIN public.steeve_clients_servis() sc ON sc.id = o.client_id
     WHERE o.statut IN ('interesse', 'souhaite_postuler') AND o.date_envoi > p_now - interval '21 days' AND o.updated_at < p_now - interval '3 days'
       AND NOT EXISTS (SELECT 1 FROM public.visites v WHERE v.offre_id = o.id AND v.client_id = o.client_id AND coalesce(v.statut, '') <> 'annulee' AND v.date_visite > p_now - interval '1 day')
     LIMIT 100) x));
  -- F4 — visite réelle passée depuis plus de 12 h sans compte rendu ni décision.
  v_res := v_res || jsonb_build_object('f_compte_rendu', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT v.id, v.offre_id, v.client_id, sc.prenom, coalesce(nullif(v.adresse, ''), o.adresse) AS adresse, v.date_visite, coalesce(v.post_visit_question_sent, false) AS question_envoyee
      FROM public.visites v JOIN public.steeve_clients_servis() sc ON sc.id = v.client_id LEFT JOIN public.offres o ON o.id = v.offre_id
     WHERE coalesce(v.statut, '') <> 'annulee' AND v.date_visite < p_now - interval '12 hours' AND v.date_visite > p_now - interval '7 days'
       AND (o.statut IN ('interesse', 'visite_planifiee', 'visite_effectuee', 'souhaite_postuler') OR v.est_deleguee OR v.client_confirme_visite_at IS NOT NULL)
       AND v.compte_rendu IS NULL AND v.feedback_agent IS NULL AND v.feedback_coursier IS NULL AND v.client_decision IS NULL
     LIMIT 100) x));

  -- G1 — candidature acceptée depuis 3 jours sans bail ; G4 — clés remises sans demande d'avis.
  v_res := v_res || jsonb_build_object('g_bail', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT ca.id, ca.offre_id, ca.client_id, sc.prenom, sc.nom, o.adresse, ca.updated_at AS depuis,
           (SELECT a.destinataire FROM public.steeve_actions a WHERE a.kind = 'lecture_mail' AND a.offre_id = ca.offre_id
             AND a.controles ->> 'categorie' = 'candidature_acceptee' AND a.destinataire IS NOT NULL ORDER BY a.created_at DESC LIMIT 1) AS regie_email,
           (SELECT a.objet FROM public.steeve_actions a WHERE a.kind = 'lecture_mail' AND a.offre_id = ca.offre_id
             AND a.controles ->> 'categorie' = 'candidature_acceptee' ORDER BY a.created_at DESC LIMIT 1) AS objet
      FROM public.candidatures ca JOIN public.steeve_clients_servis() sc ON sc.id = ca.client_id LEFT JOIN public.offres o ON o.id = ca.offre_id
     WHERE ca.statut IN ('acceptee', 'attente_bail') AND NOT coalesce(ca.bail_recu, false) AND ca.updated_at < p_now - interval '3 days'
     LIMIT 50) x));
  v_res := v_res || jsonb_build_object('g_avis', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT ca.id, ca.client_id, c.user_id, p.prenom, o.adresse
      FROM public.candidatures ca JOIN public.clients c ON c.id = ca.client_id LEFT JOIN public.profiles p ON p.id = c.user_id
      LEFT JOIN public.offres o ON o.id = ca.offre_id
     WHERE coalesce(ca.cles_remises, false) AND NOT coalesce(ca.avis_google_envoye, false) AND ca.cles_remises_at > p_now - interval '30 days'
     LIMIT 50) x));
  RETURN v_res;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_surveillance(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_surveillance(timestamptz) TO service_role;

-- F2 : contact passé « sans suite » (une seule fois), offre à reprendre par l'agent avec la note de suivi.
CREATE OR REPLACE FUNCTION public.steeve_contact_sans_suite(p_contact_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  UPDATE public.contacts_annonceurs SET statut = 'sans_suite', updated_at = now()
   WHERE id = p_contact_id AND statut = 'relance' AND reponse_le IS NULL
  RETURNING offre_id INTO v;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  UPDATE public.offres SET needs_agent_action = true, commentaires = 'Visite à fixer : en attente de la réponse de l''annonceur.', updated_at = now()
   WHERE id = v.offre_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_contact_sans_suite(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_contact_sans_suite(uuid) TO service_role;

-- G4 : demande d'avis Google faite une seule fois.
CREATE OR REPLACE FUNCTION public.steeve_avis_envoye(p_candidature_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH u AS (UPDATE public.candidatures SET avis_google_envoye = true, updated_at = now()
              WHERE id = p_candidature_id AND NOT coalesce(avis_google_envoye, false) RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;
REVOKE ALL ON FUNCTION public.steeve_avis_envoye(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_avis_envoye(uuid) TO service_role;
