-- Copilote admin (Steeve) : outils de lecture détaillée demandés par l'admin le 26.10.2026.
-- Avant, Steeve ne voyait que des totaux : ni la liste des offres d'un client (dates, statuts), ni le suivi des
-- offres par étape (« intéressée », à gérer…), ni les demandes de postulation, ni le détail des visites.
-- Réservé aux administrateurs (vérifié en base), lecture seule, sans coordonnées (ni téléphone ni e-mail).
-- Additive et idempotente.

-- Clients visés : par identifiant, sinon par nom (prénom nom ou nom prénom), sinon tous.
CREATE OR REPLACE FUNCTION public.steeve_admin_clients_vises(p_client text, p_client_id uuid)
RETURNS TABLE (client_id uuid, client text, statut text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cl.id, public.steeve_person_name(cl.user_id), cl.statut
    FROM public.clients cl
    LEFT JOIN public.profiles pr ON pr.id = cl.user_id
   WHERE cl.anonymise_at IS NULL
     AND (p_client_id IS NULL OR cl.id = p_client_id)
     AND (coalesce(trim(p_client), '') = ''
          OR lower(coalesce(pr.prenom, '') || ' ' || coalesce(pr.nom, '') || ' ' || coalesce(pr.nom, '') || ' ' || coalesce(pr.prenom, ''))
             LIKE '%' || lower(trim(p_client)) || '%');
$$;
REVOKE ALL ON FUNCTION public.steeve_admin_clients_vises(text, uuid) FROM PUBLIC, anon, authenticated;

-- Offres détaillées, avec l'étape et la prochaine action du « Suivi des offres » (mêmes règles que l'écran).
CREATE OR REPLACE FUNCTION public.admin_copilot_offres(
  p_client text DEFAULT NULL, p_client_id uuid DEFAULT NULL, p_statut text DEFAULT NULL, p_etape text DEFAULT NULL,
  p_jours integer DEFAULT 30, p_limite integer DEFAULT 15, p_suivi_auto boolean DEFAULT false, p_clients_actifs boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jours integer := least(greatest(coalesce(p_jours, 30), 1), 365);
  v_lim integer := least(greatest(coalesce(p_limite, 15), 1), 40);
  v_res jsonb;
  v_total integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  WITH cv AS (
    SELECT * FROM public.steeve_admin_clients_vises(p_client, p_client_id) c
     WHERE NOT coalesce(p_clients_actifs, true) OR c.statut = 'actif' OR p_client_id IS NOT NULL OR coalesce(trim(p_client), '') <> ''
  ), base AS (
    SELECT o.*, cv.client, cv.statut AS client_statut, v.date_visite, v.statut AS visite_statut, v.est_deleguee,
           v.client_confirme_visite_at, v.client_decision,
           extract(epoch FROM now() - o.created_at) / 3600 AS h_envoi
      FROM public.offres o
      JOIN cv ON cv.client_id = o.client_id
      LEFT JOIN LATERAL (
        SELECT vi.date_visite, vi.statut, vi.est_deleguee, vi.client_confirme_visite_at, vi.client_decision
          FROM public.visites vi WHERE vi.offre_id = o.id AND vi.date_visite IS NOT NULL
         ORDER BY vi.date_visite DESC LIMIT 1) v ON true
     WHERE o.created_at > now() - make_interval(days => v_jours)
       AND coalesce(o.statut, '') NOT IN ('doublon', 'tiktok')
       AND (NOT coalesce(p_suivi_auto, false) OR o.envoi_auto)
       AND (coalesce(p_statut, '') = '' OR o.statut = p_statut
            OR (p_statut IN ('interessee', 'interesse') AND o.statut = 'interesse')
            OR (p_statut IN ('refusee', 'refuse') AND o.statut IN ('refusee', 'refuse')))
  ), etape AS (
    SELECT b.*,
      CASE
        WHEN b.needs_agent_action AND b.missing_info IS NOT NULL THEN 'a_gerer|À compléter : ' || b.missing_info
        WHEN b.needs_agent_action AND b.date_visite IS NULL THEN 'a_gerer|Appeler l''annonceur pour fixer la visite'
        WHEN b.needs_agent_action THEN 'a_gerer|Action requise sur la visite'
        WHEN coalesce(b.statut, '') IN ('refusee', 'refuse') OR b.client_decision IN ('refuse', 'refusee') THEN 'cloturees|Refusée par le client'
        WHEN coalesce(b.statut, '') IN ('candidature', 'candidature_deposee', 'acceptee', 'signature_effectuee', 'bail_conclu') THEN 'cloturees|Candidature en cours ou terminée'
        WHEN b.statut = 'souhaite_postuler' OR b.client_decision = 'souhaite_postuler' THEN 'cloturees|Le client souhaite postuler : suivi dans Postulations'
        WHEN b.date_visite > now() AND (b.est_deleguee OR b.client_confirme_visite_at IS NOT NULL) THEN 'visite|Visite fixée et confirmée'
        WHEN b.date_visite > now() THEN 'visite|Visite fixée : en attente de la confirmation du client'
        WHEN b.date_visite IS NOT NULL AND b.date_visite < now() - interval '48 hours' THEN 'visite|Visite passée : relancer le client pour sa décision|retard'
        WHEN b.date_visite IS NOT NULL THEN 'visite|Visite passée : en attente de la décision du client'
        WHEN b.statut = 'interesse' AND b.h_envoi >= 72 THEN 'attente_annonceur|Pas de réponse de l''annonceur : l''appeler|retard'
        WHEN b.statut = 'interesse' THEN 'attente_annonceur|Client intéressé : demande de visite en attente de l''annonceur'
        WHEN b.h_envoi >= 48 THEN 'sans_reponse|Pas de réponse du client : le relancer|retard'
        ELSE 'sans_reponse|Offre envoyée : en attente de la réponse du client'
      END AS pa
      FROM base b
  ), filtre AS (
    SELECT e.*, split_part(e.pa, '|', 1) AS etape, split_part(e.pa, '|', 2) AS action,
           (split_part(e.pa, '|', 3) = 'retard' OR (e.needs_agent_action AND e.h_envoi >= 24)) AS en_retard
      FROM etape e
     WHERE coalesce(p_etape, '') = '' OR split_part(e.pa, '|', 1) = p_etape
  )
  SELECT count(*)::int,
         coalesce(jsonb_agg(to_jsonb(x) - 'rang' ORDER BY x.rang) FILTER (WHERE x.rang <= v_lim), '[]'::jsonb)
    INTO v_total, v_res
    FROM (
      SELECT f.client, f.client_statut, f.adresse, f.prix, f.pieces, f.statut,
             CASE WHEN f.envoi_auto THEN 'offre auto' ELSE 'offre agent' END AS origine,
             to_char(f.created_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS envoyee_le,
             round(f.h_envoi / 24, 1) AS jours_depuis_envoi,
             to_char(f.interesse_notified_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS interet_signale_le,
             to_char(f.postulation_demandee_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS postulation_demandee_le,
             to_char(f.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS visite_le,
             f.visite_statut, f.client_decision AS decision_client_visite,
             f.etape, f.action AS prochaine_action, f.en_retard, f.missing_info AS info_manquante,
             f.id AS offre_id, f.client_id,
             row_number() OVER (ORDER BY array_position(ARRAY['a_gerer','attente_annonceur','visite','sans_reponse','cloturees'], f.etape),
                                f.en_retard DESC, f.created_at DESC) AS rang
        FROM filtre f
    ) x;
  RETURN jsonb_build_object('total', v_total, 'affichees', least(v_total, v_lim), 'periode_jours', v_jours,
                            'ordre', 'à gérer, attente annonceur, visite, sans réponse, clôturées ; en retard d''abord, puis les plus récentes',
                            'offres', v_res);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_copilot_offres(text, uuid, text, text, integer, integer, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_offres(text, uuid, text, text, integer, integer, boolean, boolean) TO authenticated;

-- Demandes de postulation : offre où le client veut postuler, file de préparation, dossier préparé, candidature.
CREATE OR REPLACE FUNCTION public.admin_copilot_postulations(
  p_client text DEFAULT NULL, p_client_id uuid DEFAULT NULL, p_etat text DEFAULT NULL, p_limite integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lim integer := least(greatest(coalesce(p_limite, 10), 1), 40);
  v_res jsonb;
  v_stats jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_object_agg(status, n) INTO v_stats FROM (SELECT status, count(*) n FROM public.postulation_jobs GROUP BY status) s;
  WITH cv AS (SELECT * FROM public.steeve_admin_clients_vises(p_client, p_client_id)),
  d AS (
    SELECT o.id AS offre_id, o.client_id, cv.client, o.adresse, o.prix, o.pieces, o.statut AS statut_offre,
           o.postulation_demandee_at, j.status AS file, j.attempt_count, coalesce(j.last_error, j.ai_result ->> 'ai_error') AS last_error, j.ai_result, j.next_attempt_at, j.created_at AS file_le,
           pp.statut AS dossier, pp.motif_blocage, pp.envoye_le, pp.canal, pp.regie_nom,
           c.statut AS candidature, c.date_depot,
           greatest(o.postulation_demandee_at, j.updated_at, pp.updated_at, c.updated_at) AS derniere_activite
      FROM public.offres o
      JOIN cv ON cv.client_id = o.client_id
      LEFT JOIN LATERAL (SELECT * FROM public.postulation_jobs pj WHERE pj.offre_id = o.id ORDER BY pj.created_at DESC LIMIT 1) j ON true
      LEFT JOIN LATERAL (SELECT * FROM public.postulations_preparees p WHERE p.offre_id = o.id ORDER BY p.created_at DESC LIMIT 1) pp ON true
      LEFT JOIN LATERAL (SELECT * FROM public.candidatures ca WHERE ca.offre_id = o.id ORDER BY ca.created_at DESC LIMIT 1) c ON true
     WHERE o.postulation_demandee_at IS NOT NULL OR o.statut = 'souhaite_postuler' OR j.id IS NOT NULL OR pp.id IS NOT NULL
  ), e AS (
    SELECT d.*,
      CASE
        WHEN d.envoye_le IS NOT NULL OR coalesce(d.candidature, 'demande_postulation') <> 'demande_postulation'
             OR d.statut_offre IN ('candidature_deposee', 'acceptee') THEN 'envoyee'
        WHEN d.file = 'blocked' OR d.dossier = 'bloque' THEN 'bloquee'
        WHEN d.file IN ('queued', 'processing') THEN 'en_file'
        WHEN d.file = 'ready' OR d.dossier IN ('pret', 'prete', 'a_valider', 'brouillon') THEN 'prete'
        ELSE 'a_traiter'
      END AS etat
      FROM d
  )
  SELECT coalesce(jsonb_agg(to_jsonb(x) - 'ord' ORDER BY x.ord DESC NULLS LAST), '[]'::jsonb) INTO v_res
    FROM (
      SELECT e.client, e.adresse, e.prix, e.pieces, e.statut_offre, e.etat,
             to_char(e.postulation_demandee_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS demandee_le,
             e.file AS file_preparation, e.attempt_count AS essais, left(e.last_error, 160) AS derniere_erreur,
             CASE WHEN jsonb_typeof(e.ai_result -> 'missing_items') = 'array' AND jsonb_array_length(e.ai_result -> 'missing_items') > 0
                  THEN e.ai_result -> 'missing_items' END AS pieces_manquantes,
             left(e.ai_result ->> 'concise_staff_summary', 240) AS resume_controle,
             to_char(e.next_attempt_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS prochain_essai,
             e.dossier AS dossier_prepare, left(e.motif_blocage, 200) AS motif_blocage, e.canal, e.regie_nom AS regie,
             to_char(e.envoye_le AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS dossier_envoye_le,
             e.candidature, to_char(e.date_depot AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS depot_le,
             e.offre_id, e.client_id, coalesce(e.postulation_demandee_at, e.file_le, e.derniere_activite) AS ord
        FROM e
       WHERE coalesce(p_etat, '') = '' OR e.etat = p_etat
       ORDER BY coalesce(e.postulation_demandee_at, e.file_le, e.derniere_activite) DESC NULLS LAST
       LIMIT v_lim
    ) x;
  RETURN jsonb_build_object('file_preparation_globale', coalesce(v_stats, '{}'::jsonb),
                            'etats', 'a_traiter, en_file, bloquee, prete, envoyee', 'demandes', v_res);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_copilot_postulations(text, uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_postulations(text, uuid, text, integer) TO authenticated;

-- Visites détaillées (à venir, passées ou toutes) d'un client ou de tous.
CREATE OR REPLACE FUNCTION public.admin_copilot_visites(
  p_client text DEFAULT NULL, p_client_id uuid DEFAULT NULL, p_periode text DEFAULT 'a_venir', p_jours integer DEFAULT 14, p_limite integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jours integer := least(greatest(coalesce(p_jours, 14), 1), 90);
  v_lim integer := least(greatest(coalesce(p_limite, 20), 1), 50);
  v_res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) - 'd' ORDER BY x.d), '[]'::jsonb) INTO v_res
    FROM (
      SELECT cv.client, coalesce(v.adresse, o.adresse) AS adresse,
             to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS le,
             to_char(v.date_visite_fin AT TIME ZONE 'Europe/Zurich', 'HH24:MI') AS fin,
             v.statut, CASE WHEN v.est_deleguee THEN 'déléguée (agent/coursier)' ELSE 'le client visite' END AS mode,
             public.steeve_person_name(co.user_id) AS coursier, v.statut_coursier,
             (v.client_confirme_visite_at IS NOT NULL) AS client_a_confirme, v.client_decision AS decision_client,
             (v.compte_rendu IS NOT NULL OR v.feedback_coursier IS NOT NULL OR v.feedback_agent IS NOT NULL) AS compte_rendu_recu,
             o.statut AS statut_offre, v.offre_id, v.client_id,
             CASE WHEN p_periode = 'passees' THEN -extract(epoch FROM v.date_visite) ELSE extract(epoch FROM v.date_visite) END AS d
        FROM public.visites v
        JOIN public.steeve_admin_clients_vises(p_client, p_client_id) cv ON cv.client_id = v.client_id
        LEFT JOIN public.offres o ON o.id = v.offre_id
        LEFT JOIN public.coursiers co ON co.id = v.coursier_id
       WHERE v.date_visite IS NOT NULL
         AND CASE coalesce(p_periode, 'a_venir')
               WHEN 'passees' THEN v.date_visite BETWEEN now() - make_interval(days => v_jours) AND now()
               WHEN 'toutes' THEN v.date_visite BETWEEN now() - make_interval(days => v_jours) AND now() + make_interval(days => v_jours)
               ELSE v.date_visite BETWEEN now() AND now() + make_interval(days => v_jours)
             END
       ORDER BY CASE WHEN p_periode = 'passees' THEN -extract(epoch FROM v.date_visite) ELSE extract(epoch FROM v.date_visite) END
       LIMIT v_lim
    ) x;
  RETURN jsonb_build_object('periode', coalesce(p_periode, 'a_venir'), 'jours', v_jours, 'visites', v_res,
    'note', 'Visites à fixer : outil offres avec etape a_gerer (appel requis) ou attente_annonceur (demande envoyée, pas encore de date).');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_copilot_visites(text, uuid, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_visites(text, uuid, text, integer, integer) TO authenticated;
