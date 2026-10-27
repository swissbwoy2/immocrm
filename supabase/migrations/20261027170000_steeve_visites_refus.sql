-- Client pas intéressé (règle de l'admin du 27.10.2026) : la visite n'est PAS annulée chez l'annonceur — le créneau
-- reste pour les autres clients. Seul ce client est retiré de la visite (sa ligne visites passe « annulee »,
-- décision « refuse »), sans aucun message à l'annonceur. Vaut pour le bouton « pas intéressé » de l'application
-- (déclencheur sur offres) comme pour Steeve et le copilote.

CREATE OR REPLACE FUNCTION public.steeve_retirer_client_visites(p_offre_id uuid, p_client_id uuid, p_note text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.visites
     SET statut = 'annulee',
         client_decision = coalesce(client_decision, 'refuse'),
         client_decision_at = coalesce(client_decision_at, now()),
         notes = left(trim(both E'\n' FROM coalesce(notes, '') || E'\n' ||
                 coalesce(p_note, 'Client pas intéressé le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') ||
                 ' : retiré de la visite. Créneau de l''annonceur maintenu pour les autres clients (annonceur non prévenu).')), 2000),
         updated_at = now()
   WHERE offre_id = p_offre_id AND client_id = p_client_id
     AND date_visite > now()
     AND coalesce(statut, '') NOT IN ('annulee', 'refusee', 'effectuee');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_retirer_client_visites(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_retirer_client_visites(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.steeve_offre_refusee_retire_visites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'refusee' AND OLD.statut IS DISTINCT FROM 'refusee' AND NEW.client_id IS NOT NULL THEN
    PERFORM public.steeve_retirer_client_visites(NEW.id, NEW.client_id, NULL);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_offre_refusee_retire_visites ON public.offres;
CREATE TRIGGER trg_offre_refusee_retire_visites AFTER UPDATE OF statut ON public.offres
  FOR EACH ROW EXECUTE FUNCTION public.steeve_offre_refusee_retire_visites();

-- Réponse du client à une offre : « pas intéressé » possible aussi quand une visite est prévue ou faite (pas après une
-- candidature déposée) ; le client est alors retiré de ses visites à venir pour ce bien (déclencheur ci-dessus).
CREATE OR REPLACE FUNCTION public.steeve_client_reponse_offre(p_client_id uuid, p_offre_id uuid, p_reponse text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statut text;
  v_new text := CASE p_reponse WHEN 'interesse' THEN 'interesse' WHEN 'refuse' THEN 'refusee' END;
  v_visites integer;
BEGIN
  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Réponse invalide' USING ERRCODE = '22023';
  END IF;
  SELECT statut INTO v_statut FROM public.offres WHERE id = p_offre_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Offre introuvable dans ton dossier.');
  END IF;
  IF v_statut = v_new THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'statut', v_statut);
  END IF;
  -- Après une candidature ou une décision de la régie : on ne réécrit pas l'historique.
  IF v_statut NOT IN ('envoyee', 'vue', 'interesse', 'refusee')
     AND NOT (v_new = 'refusee' AND v_statut IN ('visite_planifiee', 'visite_confirmee', 'visite_effectuee', 'souhaite_postuler')) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Cette offre est déjà plus loin (' || v_statut || ') : la réponse se gère avec ton agent.');
  END IF;
  SELECT count(*) INTO v_visites FROM public.visites
   WHERE offre_id = p_offre_id AND client_id = p_client_id AND date_visite > now() AND coalesce(statut, '') NOT IN ('annulee', 'refusee', 'effectuee');
  UPDATE public.offres SET statut = v_new, updated_at = now() WHERE id = p_offre_id;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, offre_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('reponse_offre', 'app', 'client', p_client_id, p_offre_id, 'fait', 'steeve', 'Réponse du client à Steeve : ' || v_new, now(),
          'offres.statut ' || v_statut || ' → ' || v_new, 'reponse_offre:' || p_offre_id || ':' || v_new || ':' || extract(epoch FROM now())::bigint,
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')));
  RETURN jsonb_build_object('ok', true, 'statut', v_new, 'avant', v_statut,
    'visites_retirees', CASE WHEN v_new = 'refusee' THEN v_visites ELSE 0 END,
    'note', CASE WHEN v_new = 'refusee' AND v_visites > 0 THEN 'Client retiré de ses visites à venir pour ce bien ; le créneau de l''annonceur reste pour les autres clients (annonceur non prévenu, rien à annuler).' END);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_reponse_offre(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_reponse_offre(uuid, uuid, text) TO service_role;

-- Copilote : retirer un client d'une visite (sans toucher au créneau de l'annonceur).
CREATE OR REPLACE FUNCTION public.admin_steeve_retirer_visite(p_visite_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT vi.id, vi.statut, vi.offre_id, vi.client_id, vi.date_visite, coalesce(o.adresse, vi.adresse) AS adresse
    INTO v FROM public.visites vi LEFT JOIN public.offres o ON o.id = vi.offre_id WHERE vi.id = p_visite_id FOR UPDATE OF vi;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'visite introuvable');
  END IF;
  IF coalesce(v.statut, '') IN ('annulee', 'refusee', 'effectuee') THEN
    RETURN jsonb_build_object('ok', true, 'deja', true, 'statut', v.statut);
  END IF;
  UPDATE public.visites
     SET statut = 'annulee', client_decision = coalesce(client_decision, 'refuse'), client_decision_at = coalesce(client_decision_at, now()),
         notes = left(trim(both E'\n' FROM coalesce(notes, '') || E'\n' || 'Retiré de la visite par l''admin le ' ||
                 to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ' (créneau de l''annonceur maintenu pour les autres clients).'), 2000),
         updated_at = now()
   WHERE id = p_visite_id;
  RETURN jsonb_build_object('ok', true, 'bien', v.adresse, 'le', to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
    'suite', 'Client retiré de cette visite ; le créneau reste pour les autres clients, l''annonceur n''est pas prévenu. Préviens le client avec ecrire_a.');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_retirer_visite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_retirer_visite(uuid) TO authenticated, service_role;

-- Copilote : visites avec le logement exact (pièces, loyer, surface, étage) — deux offres à la même adresse
-- (un 2,5 et un 4,5 pièces du même immeuble) ne se confondent plus.
CREATE OR REPLACE FUNCTION public.admin_copilot_visites(p_client text DEFAULT NULL::text, p_client_id uuid DEFAULT NULL::uuid, p_periode text DEFAULT 'a_venir'::text, p_jours integer DEFAULT 14, p_limite integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
             o.pieces, o.prix AS loyer_chf, o.surface AS surface_m2, o.etage,
             to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS le,
             to_char(v.date_visite_fin AT TIME ZONE 'Europe/Zurich', 'HH24:MI') AS fin,
             v.statut, CASE WHEN v.est_deleguee THEN 'déléguée (agent/coursier)' ELSE 'le client visite' END AS mode,
             public.steeve_person_name(co.user_id) AS coursier, v.statut_coursier,
             (v.client_confirme_visite_at IS NOT NULL) AS client_a_confirme, v.client_decision AS decision_client,
             (v.compte_rendu IS NOT NULL OR v.feedback_coursier IS NOT NULL OR v.feedback_agent IS NOT NULL) AS compte_rendu_recu,
             o.statut AS statut_offre, v.id AS visite_id, v.offre_id, v.client_id,
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
    'note', 'Même adresse = parfois deux logements différents du même immeuble : distingue-les par pièces, loyer, surface et étage. Client pas intéressé : retirer_visite (le créneau reste pour les autres). Visites à fixer : outil offres avec etape a_gerer ou attente_annonceur.');
END;
$function$;

-- Créneaux de l'annonceur dont tous les clients se sont retirés : ils restent dans l'agenda et peuvent être proposés
-- à d'autres clients (fixer_visite pour le client choisi). Rien n'est annulé chez l'annonceur.
CREATE OR REPLACE FUNCTION public.admin_copilot_creneaux_libres(p_jours integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY x._t), '[]'::jsonb) INTO v_res FROM (
    SELECT min(coalesce(o.adresse, v.adresse)) AS adresse, min(o.pieces) AS pieces, min(o.prix) AS loyer_chf,
           to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') AS le,
           count(*) FILTER (WHERE coalesce(v.statut, '') NOT IN ('annulee', 'refusee')) AS clients_inscrits,
           count(*) FILTER (WHERE v.statut = 'annulee' AND v.client_decision = 'refuse') AS clients_retires,
           min(o.lien_annonce) AS annonce, v.date_visite AS _t
      FROM public.visites v JOIN public.offres o ON o.id = v.offre_id
     WHERE v.date_visite BETWEEN now() AND now() + make_interval(days => least(greatest(coalesce(p_jours, 14), 1), 60))
     GROUP BY lower(regexp_replace(coalesce(o.adresse, v.adresse), '[^[:alnum:]]', '', 'g')), o.prix, v.date_visite
    HAVING count(*) FILTER (WHERE v.statut = 'annulee' AND v.client_decision = 'refuse') > 0
  ) x;
  RETURN jsonb_build_object('creneaux', v_res,
    'note', 'Créneaux de visite déjà obtenus chez l''annonceur, dont au moins un client s''est retiré. clients_inscrits = 0 : créneau libre, à proposer à un autre client intéressé par ce logement (fixer_visite), sans recontacter l''annonceur.');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_copilot_creneaux_libres(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_creneaux_libres(integer) TO authenticated, service_role;

-- Retours de visite : une visite déjà relancée dans un message groupé (payload.retour_visites) n'est pas relancée deux fois.
CREATE OR REPLACE FUNCTION public.steeve_visites_sans_retour(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(jsonb_agg(x ORDER BY x._gros DESC, x._t), '[]'::jsonb) FROM (
    SELECT v.id AS visite_id, v.client_id, v.offre_id, coalesce(o.adresse, v.adresse) AS adresse, v.est_deleguee,
           o.pieces, o.prix AS loyer,
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
       AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = cv.id
                        AND (m.payload ->> 'steeve_cle' = 'retour_visite:' || v.id::text
                             OR (jsonb_typeof(m.payload -> 'retour_visites') = 'array' AND m.payload -> 'retour_visites' ? v.id::text)))
     ORDER BY v.date_visite
     LIMIT least(greatest(coalesce(p_limit, 20), 1), 50)
  ) x;
$function$;

-- Rappel avant chaque visite (règle de l'admin du 27.10.2026) : le client n'a pas besoin d'apporter son dossier
-- (sauf consigne stricte de l'annonceur), mais il doit rapporter la demande de location / le QR code Flatfox / le moyen
-- de postuler, pour que l'équipe dépose la candidature dès la sortie de la visite. Une fois par visite, visites du
-- client lui-même (pas les visites déléguées), entre 2 h et 28 h avant.
CREATE OR REPLACE FUNCTION public.steeve_visites_a_rappeler(p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(jsonb_agg(x ORDER BY x._t), '[]'::jsonb) FROM (
    SELECT v.id AS visite_id, v.client_id, v.offre_id, coalesce(o.adresse, v.adresse) AS adresse, o.pieces, o.prix AS loyer,
           CASE (v.date_visite AT TIME ZONE 'Europe/Zurich')::date - (now() AT TIME ZONE 'Europe/Zurich')::date
             WHEN 0 THEN 'aujourd''hui' WHEN 1 THEN 'demain'
             ELSE 'le ' || to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'DD.MM') END
             || ' à ' || to_char(v.date_visite AT TIME ZONE 'Europe/Zurich', 'HH24"h"MI') AS quand,
           (coalesce(o.lien_annonce, '') ILIKE '%flatfox%' OR coalesce(v.source, '') ILIKE '%flatfox%') AS flatfox,
           (coalesce(v.notes, '') ~* 'dossier' AND coalesce(v.notes, '') ~* '(apporter|amener|venir avec|imprim|version papier|sur place)') AS dossier_exige,
           p.prenom, cv.id AS conversation_id, v.date_visite AS _t
      FROM public.visites v
      LEFT JOIN public.offres o ON o.id = v.offre_id
      JOIN public.clients c ON c.id = v.client_id
      LEFT JOIN public.profiles p ON p.id = c.user_id
      JOIN LATERAL (SELECT k.id FROM public.conversations k WHERE k.client_id = v.client_id::text AND k.conversation_type = 'client-agent'
                     ORDER BY k.created_at LIMIT 1) cv ON true
     WHERE v.date_visite BETWEEN now() + interval '2 hours' AND now() + interval '28 hours'
       AND v.statut IN ('planifiee', 'confirmee')
       AND NOT coalesce(v.est_deleguee, false)
       AND coalesce(v.client_decision, '') <> 'refuse'
       AND coalesce(o.statut, '') NOT IN ('refusee', 'retiree', 'archivee')
       AND public.steeve_client_servi(v.client_id)
       AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = cv.id
                        AND (m.payload ->> 'steeve_cle' = 'rappel_visite:' || v.id::text
                             OR (jsonb_typeof(m.payload -> 'rappel_visites') = 'array' AND m.payload -> 'rappel_visites' ? v.id::text)))
     ORDER BY v.date_visite
     LIMIT least(greatest(coalesce(p_limit, 30), 1), 60)
  ) x;
$function$;
REVOKE ALL ON FUNCTION public.steeve_visites_a_rappeler(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_visites_a_rappeler(integer) TO service_role;
