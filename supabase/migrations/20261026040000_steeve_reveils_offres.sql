-- Steeve réveillé tout de suite + recherche d'offres par Steeve (lot 8, partie 1).
-- 1) Nouveaux types de tâches : recherche_offres (Steeve cherche et envoie des offres à un client),
--    envoi_piece_regie (pièce demandée par une régie, lot 8 partie 2).
-- 2) Réveil instantané : toute tâche confiée à Steeve par un client, l'équipe ou une routine réveille
--    l'opérateur aussitôt (au lieu d'attendre le passage suivant). Les heures d'envoi restent appliquées par l'opérateur.
-- 3) Critères modifiés à la main (client, agent, admin) : Steeve cherche aussitôt des offres avec les nouveaux critères.
-- 4) Passages plus fréquents : opérateur toutes les 5 minutes, accueil des nouveaux clients toutes les 2 minutes.
-- Additive et idempotente.

ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_kind_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_kind_check CHECK (kind IN (
  'demande_qr', 'relance_annonceur', 'envoi_dossier', 'triage_postulations', 'demande_postulation', 'lecon', 'lecture_mail',
  'demande_visite', 'reponse_offre', 'changement_criteres', 'demande_piece', 'reprise_dossier',
  'recherche_offres', 'envoi_piece_regie'));

-- Réveil de l'opérateur pour UNE tâche (appel asynchrone, parti après la validation de la transaction).
CREATE OR REPLACE FUNCTION public.steeve_reveiller(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_autonomie'), 'off') = 'off' THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/steeve-operator',
    headers := private.edge_service_headers(),
    body := jsonb_build_object('task_id', p_task_id, 'source', 'reveil'),
    timeout_milliseconds := 120000
  );
EXCEPTION WHEN OTHERS THEN
  -- Le réveil est un raccourci : en cas d'échec, le passage suivant (5 minutes) prend la tâche.
  RAISE WARNING 'steeve_reveiller: %', SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_reveiller(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_reveiller(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.steeve_actions_reveil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.responsable = 'steeve' AND NEW.statut = 'a_faire' AND coalesce(NEW.source, 'auto') <> 'auto'
     AND NEW.kind IN ('demande_qr', 'relance_annonceur', 'envoi_dossier', 'demande_visite', 'demande_piece', 'recherche_offres', 'envoi_piece_regie') THEN
    PERFORM public.steeve_reveiller(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_steeve_actions_reveil ON public.steeve_actions;
CREATE TRIGGER trg_steeve_actions_reveil AFTER INSERT ON public.steeve_actions
  FOR EACH ROW EXECUTE FUNCTION public.steeve_actions_reveil();

-- Steeve actif pour ce client (interrupteur général + liste pilote ou « all »).
CREATE OR REPLACE FUNCTION public.steeve_client_actif(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT value = 'true' FROM public.app_config WHERE key = 'steeve_enabled'), false)
     AND (coalesce((SELECT trim(value) FROM public.app_config WHERE key = 'steeve_pilot_client_ids'), '') = 'all'
          OR p_client_id::text = ANY (string_to_array(replace(coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_pilot_client_ids'), ''), ' ', ''), ',')));
$$;
REVOKE ALL ON FUNCTION public.steeve_client_actif(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_actif(uuid) TO service_role;

-- Demande de recherche d'offres pour un client : une seule ouverte à la fois, réveil immédiat.
CREATE OR REPLACE FUNCTION public.steeve_demande_recherche_offres(p_client_id uuid, p_source text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_source NOT IN ('client', 'agent', 'admin', 'auto', 'routine') THEN
    RAISE EXCEPTION 'Source invalide' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'client introuvable');
  END IF;
  SELECT id INTO v_id FROM public.steeve_actions
   WHERE kind = 'recherche_offres' AND client_id = p_client_id AND statut IN ('a_faire', 'en_cours')
   ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'existante', true);
  END IF;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, statut, responsable, note, idempotency_key, version_regles, etapes)
  VALUES ('recherche_offres', 'app', p_source, p_client_id, 'a_faire', 'steeve', left(nullif(trim(p_note), ''), 300),
          'recherche_offres:' || p_client_id || ':' || extract(epoch FROM clock_timestamp())::text,
          (SELECT value FROM public.app_config WHERE key = 'steeve_version_regles'),
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'creee', 'source', p_source)))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'existante', false);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_demande_recherche_offres(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_demande_recherche_offres(uuid, text, text) TO service_role;

-- Critères changés à la main dans l'application (client, agent ou admin connecté) : recherche immédiate.
-- Les changements faits par le serveur (Steeve lui-même, routines) ne déclenchent rien ici : Steeve lance
-- sa recherche explicitement après modifier_criteres.
CREATE OR REPLACE FUNCTION public.steeve_criteres_modifies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'authenticated' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF coalesce(NEW.statut, '') NOT IN ('actif', 'en_attente') OR NOT public.steeve_client_actif(NEW.id) THEN
    RETURN NEW;
  END IF;
  IF (NEW.region_recherche, NEW.budget_max, NEW.pieces, NEW.type_bien)
     IS NOT DISTINCT FROM (OLD.region_recherche, OLD.budget_max, OLD.pieces, OLD.type_bien) THEN
    RETURN NEW;
  END IF;
  PERFORM public.steeve_demande_recherche_offres(NEW.id,
    CASE WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN 'admin'
         WHEN public.has_role(auth.uid(), 'agent'::app_role) THEN 'agent'
         ELSE 'client' END,
    'Critères modifiés dans l''application');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Jamais bloquer l'enregistrement des critères.
  RAISE WARNING 'steeve_criteres_modifies: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_steeve_criteres_modifies ON public.clients;
CREATE TRIGGER trg_steeve_criteres_modifies AFTER UPDATE OF region_recherche, budget_max, pieces, type_bien ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.steeve_criteres_modifies();

-- Passages plus fréquents (même commande, nouveau rythme). Ignoré si pg_cron n'est pas là (tests).
DO $do$
DECLARE
  v_cmd text;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RETURN;
  END IF;
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'steeve-operator';
  IF v_cmd IS NOT NULL THEN
    PERFORM cron.schedule('steeve-operator', '2-59/5 * * * *', v_cmd);
  END IF;
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'steeve-scheduler';
  IF v_cmd IS NOT NULL THEN
    PERFORM cron.schedule('steeve-scheduler', '*/2 * * * *', v_cmd);
  END IF;
END
$do$;

-- 5) Réponse de la régie : dossier retenu ou bail envoyé → Steeve met à jour la candidature et prévient le client
--    tout de suite (comme la routine Surveillance, A6) ; l'équipe reste alertée pour la suite (bail, garantie, signature).
CREATE OR REPLACE FUNCTION public.steeve_apply_acceptation(p_offre_id uuid, p_client_id uuid, p_bail boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cand uuid;
  v_statut text;
  v_changed boolean := false;
BEGIN
  SELECT id, statut INTO v_cand, v_statut FROM public.candidatures WHERE offre_id = p_offre_id AND client_id = p_client_id
   AND statut IN ('en_attente', 'demande_postulation', 'acceptee', 'attente_bail', 'bail_recu') ORDER BY created_at DESC LIMIT 1;
  IF v_cand IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'aucune candidature en cours pour ce bien');
  END IF;
  IF p_bail THEN
    IF v_statut <> 'bail_recu' THEN
      UPDATE public.candidatures SET statut = 'bail_recu', bail_recu = true, bail_recu_at = coalesce(bail_recu_at, now()), updated_at = now() WHERE id = v_cand;
      v_changed := true;
    END IF;
    PERFORM public.steeve_set_note(p_offre_id, 'Candidature acceptée : bail reçu de la régie le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || '.');
  ELSE
    IF v_statut IN ('en_attente', 'demande_postulation') THEN
      UPDATE public.candidatures SET statut = 'acceptee', updated_at = now() WHERE id = v_cand;
      v_changed := true;
      PERFORM public.steeve_set_note(p_offre_id, 'Candidature acceptée le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ' : bail en préparation par la régie.');
    END IF;
  END IF;
  UPDATE public.offres SET statut = 'acceptee', updated_at = now() WHERE id = p_offre_id AND coalesce(statut, '') <> 'acceptee';
  RETURN jsonb_build_object('ok', true, 'candidature_id', v_cand, 'deja', NOT v_changed);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_apply_acceptation(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_apply_acceptation(uuid, uuid, boolean) TO service_role;
