-- Objectifs de l'année fixés par l'admin le 26.10.2026 : 5 à 10 candidatures déposées par jour, 6 à 12 offres par jour,
-- un bail au moins tous les 2 à 3 jours, 1 à 10 nouveaux mandats par jour ; gros loyers traités en premier (sans
-- négliger les autres) ; retours de visite demandés au client pour conclure vite.

INSERT INTO public.app_config (key, value) VALUES
  ('steeve_objectifs', '{"candidatures_jour":[5,10],"offres_jour":[6,12],"bail_tous_les_jours":3,"mandats_jour":[1,10],"gros_loyers":{"studio":1300,"2.5":1600,"3.5":2300,"4.5":2700}}')
ON CONFLICT (key) DO NOTHING;

-- Gros loyer (prioritaire) : studio > 1300, 2 à 2,5 pièces > 1600, 3 à 3,5 > 2300, 4 pièces et plus > 2700 (CHF/mois).
CREATE OR REPLACE FUNCTION public.steeve_gros_loyer(p_prix numeric, p_pieces numeric)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(p_prix, 0) > CASE
           WHEN coalesce(p_pieces, 0) < 2 THEN 1300
           WHEN p_pieces < 3 THEN 1600
           WHEN p_pieces < 4 THEN 2300
           ELSE 2700 END;
$$;

-- Balayage des offres « intéressé » sans visite : gros loyers d'abord, puis les plus récentes (rien n'est écarté).
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
     ORDER BY public.steeve_gros_loyer(f.prix, f.pieces) DESC, coalesce(f.interesse_notified_at, f.updated_at) DESC
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

-- Visites passées (2 h à 3 jours) sans retour du client : Steeve lui demande comment c'était et s'il veut postuler.
-- Visite réelle seulement (offre d'intérêt, visite confirmée ou déléguée avec compte rendu), sans candidature ni refus.
CREATE OR REPLACE FUNCTION public.steeve_visites_sans_retour(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x._gros DESC, x._t), '[]'::jsonb) FROM (
    SELECT v.id AS visite_id, v.client_id, v.offre_id, coalesce(o.adresse, v.adresse) AS adresse, v.est_deleguee,
           to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY "à" HH24"h"MI') AS le,
           (v.compte_rendu IS NOT NULL OR v.feedback_coursier IS NOT NULL) AS compte_rendu,
           p.prenom, cv.id AS conversation_id,
           public.steeve_gros_loyer(o.prix, o.pieces) AS _gros, v.date_visite AS _t
      FROM public.visites v
      JOIN public.offres o ON o.id = v.offre_id
      JOIN public.clients c ON c.id = v.client_id
      LEFT JOIN public.profiles p ON p.id = c.user_id
      JOIN LATERAL (SELECT k.id FROM public.conversations k WHERE k.client_id = v.client_id::text AND k.conversation_type = 'client-agent'
                     ORDER BY k.created_at LIMIT 1) cv ON true
     WHERE v.date_visite BETWEEN now() - interval '3 days' AND now() - interval '2 hours'
       AND coalesce(v.statut, '') NOT IN ('annulee', 'refusee')
       AND v.client_decision IS NULL
       AND o.statut IN ('interesse', 'visite_planifiee', 'visite_effectuee')
       -- Visite déléguée : on attend le compte rendu du collaborateur.
       AND (NOT coalesce(v.est_deleguee, false) OR v.compte_rendu IS NOT NULL OR v.feedback_coursier IS NOT NULL)
       AND public.steeve_client_servi(v.client_id)
       AND NOT EXISTS (SELECT 1 FROM public.candidatures ca WHERE ca.offre_id = v.offre_id AND ca.client_id = v.client_id)
       AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = cv.id AND m.payload ->> 'steeve_cle' = 'retour_visite:' || v.id::text)
     ORDER BY v.date_visite
     LIMIT least(greatest(coalesce(p_limit, 20), 1), 50)
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_visites_sans_retour(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_visites_sans_retour(integer) TO service_role;

-- Copilote : où en sont les objectifs aujourd'hui (heure suisse) et sur les derniers jours.
CREATE OR REPLACE FUNCTION public.admin_steeve_objectifs()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jour timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  v_obj jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT value::jsonb INTO v_obj FROM public.app_config WHERE key = 'steeve_objectifs';
  RETURN jsonb_build_object(
    'objectifs', v_obj,
    'aujourd_hui', jsonb_build_object(
      'candidatures_deposees', (SELECT count(DISTINCT (offre_id, client_id)) FROM (
          SELECT offre_id, client_id FROM public.candidatures WHERE date_depot >= v_jour
          UNION SELECT offre_id, client_id FROM public.postulations_preparees WHERE statut = 'envoye' AND envoye_le >= v_jour) d),
      'offres_envoyees', (SELECT count(*) FROM public.offres WHERE date_envoi >= v_jour),
      'offres_envoyees_gros_loyers', (SELECT count(*) FROM public.offres WHERE date_envoi >= v_jour AND public.steeve_gros_loyer(prix, pieces)),
      'clients_servis_avec_offre', (SELECT count(DISTINCT client_id) FROM public.offres WHERE date_envoi >= v_jour),
      'visites_demandees', (SELECT count(*) FROM public.steeve_actions WHERE kind = 'demande_visite' AND created_at >= v_jour),
      'nouveaux_mandats_payes', (SELECT count(*) FROM public.demandes_mandat WHERE date_paiement >= v_jour),
      'nouvelles_demandes_mandat', (SELECT count(*) FROM public.demandes_mandat WHERE created_at >= v_jour)),
    'sept_jours', jsonb_build_object(
      'candidatures_deposees', (SELECT count(DISTINCT (offre_id, client_id)) FROM (
          SELECT offre_id, client_id FROM public.candidatures WHERE date_depot >= v_jour - interval '6 days'
          UNION SELECT offre_id, client_id FROM public.postulations_preparees WHERE statut = 'envoye' AND envoye_le >= v_jour - interval '6 days') d),
      'offres_envoyees', (SELECT count(*) FROM public.offres WHERE date_envoi >= v_jour - interval '6 days'),
      'nouveaux_mandats_payes', (SELECT count(*) FROM public.demandes_mandat WHERE date_paiement >= v_jour - interval '6 days'),
      'candidatures_acceptees', (SELECT count(*) FROM public.candidatures WHERE statut NOT IN ('en_attente', 'demande_postulation', 'refusee') AND updated_at >= v_jour - interval '6 days')),
    'baux', jsonb_build_object(
      'signes_30_jours', (SELECT count(*) FROM public.candidatures WHERE coalesce(signature_effectuee, false) AND signature_effectuee_at >= now() - interval '30 days'),
      'dernier_signe_le', (SELECT to_char(max(signature_effectuee_at) AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') FROM public.candidatures WHERE coalesce(signature_effectuee, false)),
      'en_cours', (SELECT count(*) FROM public.candidatures WHERE statut IN ('acceptee', 'attente_bail', 'bail_recu', 'signature_planifiee'))),
    'leviers', jsonb_build_object(
      'interesses_sans_visite', (SELECT count(*) FROM public.offres f WHERE f.statut IN ('interesse', 'souhaite_postuler')
                                  AND coalesce(f.interesse_notified_at, f.updated_at) > now() - interval '21 days' AND public.steeve_client_servi(f.client_id)
                                  AND NOT EXISTS (SELECT 1 FROM public.visites v WHERE v.offre_id = f.id AND coalesce(v.statut, '') NOT IN ('annulee', 'refusee'))),
      'postulations_en_file', (SELECT count(*) FROM public.postulation_jobs WHERE status NOT IN ('completed')),
      'dossiers_a_valider', (SELECT count(*) FROM public.postulations_preparees WHERE statut = 'a_valider'),
      'demandes_mandat_non_payees', (SELECT count(*) FROM public.demandes_mandat WHERE statut = 'en_attente' AND created_at > now() - interval '30 days'))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_objectifs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_objectifs() TO authenticated, service_role;
