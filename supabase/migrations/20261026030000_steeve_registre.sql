-- Steeve : registre partagé des tâches (Steeve, routines Claude/ChatGPT, équipe), reprise d'un dossier au bon
-- endroit, actions client exécutées sur demande, double canal Flatfox, contrôle administrateur.
-- Le registre réutilise steeve_actions (journal existant) : une ligne = une tâche, avec étapes, responsable,
-- verrou temporaire renouvelable (jeton), statuts d'attente, « résultat inconnu » et preuves.
-- Additive et idempotente. Aucune donnée existante n'est modifiée en dehors des contraintes élargies.

-- 1) Colonnes du registre
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS canal text;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS responsable text NOT NULL DEFAULT 'steeve';
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS etape text;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS etapes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS echeance timestamptz;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS tentatives integer NOT NULL DEFAULT 0;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS verrou_par text;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS verrou_jeton uuid;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS verrou_jusqu timestamptz;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS derniere_activite timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS version_regles text;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE public.steeve_actions ADD COLUMN IF NOT EXISTS statut_avant text;

ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_kind_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_kind_check CHECK (kind IN (
  'demande_qr', 'relance_annonceur', 'envoi_dossier', 'triage_postulations', 'demande_postulation', 'lecon', 'lecture_mail',
  'demande_visite', 'reponse_offre', 'changement_criteres', 'demande_piece', 'reprise_dossier'));
ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_statut_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_statut_check CHECK (statut IN (
  'a_faire', 'en_cours', 'en_attente_client', 'en_attente_formulaire', 'en_attente_regie', 'bloque', 'bloque_acces',
  'resultat_inconnu', 'suspendu', 'a_blanc', 'a_valider', 'fait', 'annule', 'echec'));
ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_source_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_source_check CHECK (source IN ('auto', 'client', 'agent', 'admin', 'routine'));
ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_responsable_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_responsable_check CHECK (responsable IN (
  'steeve', 'routine-chrome', 'routine-chatgpt', 'routine-surveillance', 'humain'));
ALTER TABLE public.steeve_actions DROP CONSTRAINT IF EXISTS steeve_actions_canal_check;
ALTER TABLE public.steeve_actions ADD CONSTRAINT steeve_actions_canal_check CHECK (canal IS NULL OR canal IN ('email', 'flatfox', 'app', 'interne'));

CREATE INDEX IF NOT EXISTS steeve_actions_offre_idx ON public.steeve_actions (offre_id, kind);
CREATE INDEX IF NOT EXISTS steeve_actions_ouvertes_idx ON public.steeve_actions (responsable, statut, created_at)
  WHERE statut IN ('a_faire', 'en_cours', 'resultat_inconnu', 'suspendu');

-- Règles appliquées (version tracée sur chaque tâche).
INSERT INTO public.app_config (key, value, updated_at) VALUES ('steeve_version_regles', 'autonomie-2026-10-26', now())
ON CONFLICT (key) DO NOTHING;

-- 2) Le mode ne change plus tout seul : le passage en autonome est un choix explicite de l'administrateur.
CREATE OR REPLACE FUNCTION public.steeve_operator_mode(p_mailbox_ready boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text := coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_autonomie'), 'off');
  v_since timestamptz := nullif((SELECT value FROM public.app_config WHERE key = 'steeve_autonomie_depuis'), '')::timestamptz;
BEGIN
  IF v_mode NOT IN ('off', 'a_blanc', 'autonome') THEN
    v_mode := 'off';
  END IF;
  IF v_mode = 'a_blanc' AND v_since IS NULL AND p_mailbox_ready THEN
    v_since := now();
    INSERT INTO public.app_config (key, value, updated_at) VALUES ('steeve_autonomie_depuis', v_since::text, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  END IF;
  RETURN jsonb_build_object('mode', v_mode, 'depuis', v_since, 'autonome_le', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_operator_mode(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_operator_mode(boolean) TO service_role;

-- 3) Qui peut exécuter : Steeve (clé de service), un compte « automation_operator », un administrateur,
--    ou une connexion directe à la base (routines locales via le connecteur de base), jamais un client.
CREATE OR REPLACE FUNCTION public.steeve_executant_autorise()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      OR (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin'::app_role)
                                      OR public.has_role(auth.uid(), 'automation_operator'::app_role)))
      OR (auth.uid() IS NULL AND session_user NOT IN ('authenticator', 'anon', 'authenticated'));
$$;
REVOKE ALL ON FUNCTION public.steeve_executant_autorise() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_executant_autorise() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.steeve_tache_evt(p_etapes jsonb, p_evt jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  -- Historique borné aux 40 derniers événements.
  SELECT CASE WHEN jsonb_array_length(coalesce(p_etapes, '[]'::jsonb)) >= 40
              THEN (SELECT coalesce(jsonb_agg(e ORDER BY i), '[]'::jsonb) FROM jsonb_array_elements(p_etapes) WITH ORDINALITY t(e, i) WHERE i > 1)
              ELSE coalesce(p_etapes, '[]'::jsonb) END || jsonb_build_array(p_evt);
$$;

-- 4) Réservation atomique d'une tâche (verrou temporaire, jeton propre à l'exécutant).
CREATE OR REPLACE FUNCTION public.steeve_tache_reserver(p_id uuid, p_executant text, p_ttl_s integer DEFAULT 600)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.steeve_actions%ROWTYPE;
  v_jeton uuid := gen_random_uuid();
  v_ttl integer := least(greatest(coalesce(p_ttl_s, 600), 30), 3600);
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM public.steeve_actions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'introuvable');
  END IF;
  IF v.responsable <> p_executant THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'autre_responsable', 'responsable', v.responsable);
  END IF;
  IF v.statut = 'resultat_inconnu' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'resultat_inconnu', 'consigne', 'Vérifier les envoyés ou accusés avant toute nouvelle tentative.');
  END IF;
  IF v.statut = 'suspendu' THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'suspendue');
  END IF;
  IF v.verrou_jusqu IS NOT NULL AND v.verrou_jusqu > now() THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'deja_reservee', 'par', v.verrou_par, 'jusqu', v.verrou_jusqu);
  END IF;
  -- Verrou expiré au milieu d'un envoi : on ne sait pas si l'envoi est parti. Jamais de nouvelle tentative à l'aveugle.
  IF v.verrou_jusqu IS NOT NULL AND coalesce(v.etape, '') LIKE 'envoi%' THEN
    UPDATE public.steeve_actions
       SET statut = 'resultat_inconnu', motif = 'Verrou expiré pendant l''envoi : vérifier les envoyés avant de réessayer.',
           verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL, derniere_activite = now(), updated_at = now(),
           etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'resultat_inconnu', 'par', v.verrou_par))
     WHERE id = p_id;
    RETURN jsonb_build_object('ok', false, 'motif', 'resultat_inconnu');
  END IF;
  IF v.statut NOT IN ('a_faire', 'en_cours', 'echec', 'bloque_acces') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'non_disponible', 'statut', v.statut);
  END IF;
  UPDATE public.steeve_actions
     SET verrou_par = p_executant, verrou_jeton = v_jeton, verrou_jusqu = now() + make_interval(secs => v_ttl),
         statut = 'en_cours', tentatives = tentatives + 1, derniere_activite = now(), updated_at = now(),
         version_regles = coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_version_regles'), version_regles),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'reservee', 'par', p_executant))
   WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'jeton', v_jeton, 'id', p_id, 'kind', v.kind, 'offre_id', v.offre_id,
    'client_id', v.client_id, 'canal', v.canal, 'etape', v.etape, 'etapes', v.etapes, 'note', v.note);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_tache_reserver(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_tache_reserver(uuid, text, integer) TO authenticated, service_role;

-- Prochaine tâche disponible pour un exécutant (routines : une seule à la fois, sans concurrence).
CREATE OR REPLACE FUNCTION public.steeve_tache_reserver_suivante(p_executant text, p_kinds text[] DEFAULT NULL, p_ttl_s integer DEFAULT 900)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_id FROM public.steeve_actions
   WHERE responsable = p_executant AND statut IN ('a_faire', 'en_cours')
     AND (verrou_jusqu IS NULL OR verrou_jusqu <= now())
     AND (p_kinds IS NULL OR kind = ANY (p_kinds))
   ORDER BY created_at
   LIMIT 1
   FOR UPDATE SKIP LOCKED;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'aucune_tache');
  END IF;
  RETURN public.steeve_tache_reserver(v_id, p_executant, p_ttl_s) || jsonb_build_object(
    'bien', (SELECT o.adresse FROM public.offres o JOIN public.steeve_actions a ON a.offre_id = o.id WHERE a.id = v_id),
    'lien_annonce', (SELECT o.lien_annonce FROM public.offres o JOIN public.steeve_actions a ON a.offre_id = o.id WHERE a.id = v_id),
    'objet', (SELECT objet FROM public.steeve_actions WHERE id = v_id),
    'corps', (SELECT corps FROM public.steeve_actions WHERE id = v_id));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_tache_reserver_suivante(text, text[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_tache_reserver_suivante(text, text[], integer) TO authenticated, service_role;

-- Renouvelle le verrou : seulement avec le jeton en cours (un exécutant remplacé ne peut plus le prolonger).
CREATE OR REPLACE FUNCTION public.steeve_tache_renouveler(p_id uuid, p_jeton uuid, p_ttl_s integer DEFAULT 600)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  UPDATE public.steeve_actions
     SET verrou_jusqu = now() + make_interval(secs => least(greatest(coalesce(p_ttl_s, 600), 30), 3600)),
         derniere_activite = now(), updated_at = now()
   WHERE id = p_id AND verrou_jeton = p_jeton AND statut = 'en_cours';
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_tache_renouveler(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_tache_renouveler(uuid, uuid, integer) TO authenticated, service_role;

-- Étape : la commencer (fait = false, ex. « envoi » juste avant d'envoyer) ou la marquer faite.
CREATE OR REPLACE FUNCTION public.steeve_tache_etape(p_id uuid, p_jeton uuid, p_etape text, p_fait boolean DEFAULT true, p_detail text DEFAULT NULL, p_message_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  UPDATE public.steeve_actions
     SET etape = CASE WHEN p_fait THEN NULL ELSE left(p_etape, 60) END,
         message_id = coalesce(left(p_message_id, 300), message_id),
         derniere_activite = now(), updated_at = now(),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'etape', left(p_etape, 60), 'fait', p_fait, 'detail', left(p_detail, 300)))
   WHERE id = p_id AND verrou_jeton = p_jeton AND statut = 'en_cours';
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_tache_etape(uuid, uuid, text, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_tache_etape(uuid, uuid, text, boolean, text, text) TO authenticated, service_role;

-- Fin de tâche : seulement avec le jeton en cours. Statuts d'attente possibles (formulaire, régie, client).
CREATE OR REPLACE FUNCTION public.steeve_tache_terminer(p_id uuid, p_jeton uuid, p_statut text, p_preuve text DEFAULT NULL, p_motif text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_statut NOT IN ('fait', 'bloque', 'bloque_acces', 'echec', 'resultat_inconnu', 'annule', 'a_faire',
                      'en_attente_client', 'en_attente_formulaire', 'en_attente_regie', 'a_blanc') THEN
    RAISE EXCEPTION 'Statut invalide' USING ERRCODE = '22023';
  END IF;
  UPDATE public.steeve_actions
     SET statut = p_statut, preuve = coalesce(left(p_preuve, 1000), preuve), motif = coalesce(left(p_motif, 500), motif),
         note = coalesce(left(p_note, 1000), note),
         executed_at = CASE WHEN p_statut IN ('fait', 'en_attente_formulaire', 'en_attente_regie', 'en_attente_client') AND p_preuve IS NOT NULL THEN now() ELSE executed_at END,
         etape = CASE WHEN p_statut = 'resultat_inconnu' THEN etape ELSE NULL END,
         verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL, derniere_activite = now(), updated_at = now(),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', p_statut, 'motif', left(p_motif, 200)))
   WHERE id = p_id AND verrou_jeton = p_jeton;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_tache_terminer(uuid, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_tache_terminer(uuid, uuid, text, text, text, text) TO authenticated, service_role;

-- 5) Contrôle administrateur : suspendre, reprendre, réattribuer, annuler, trancher un résultat inconnu.
CREATE OR REPLACE FUNCTION public.admin_steeve_tache_controle(p_id uuid, p_action text, p_responsable text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.steeve_actions%ROWTYPE;
  v_evt jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM public.steeve_actions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tâche introuvable' USING ERRCODE = 'P0002';
  END IF;
  v_evt := jsonb_build_object('le', now(), 'evt', p_action, 'par', 'admin', 'admin', auth.uid(), 'note', left(p_note, 300));
  IF p_action = 'suspendre' THEN
    IF v.statut IN ('fait', 'annule', 'suspendu') THEN RAISE EXCEPTION 'Tâche non suspendable' USING ERRCODE = '22023'; END IF;
    UPDATE public.steeve_actions SET statut_avant = v.statut, statut = 'suspendu', verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL,
           etapes = public.steeve_tache_evt(etapes, v_evt), derniere_activite = now(), updated_at = now() WHERE id = p_id;
  ELSIF p_action = 'reprendre' THEN
    IF v.statut <> 'suspendu' THEN RAISE EXCEPTION 'Tâche non suspendue' USING ERRCODE = '22023'; END IF;
    UPDATE public.steeve_actions SET statut = CASE WHEN coalesce(v.statut_avant, 'a_faire') IN ('en_cours') THEN 'a_faire' ELSE coalesce(v.statut_avant, 'a_faire') END,
           statut_avant = NULL, etapes = public.steeve_tache_evt(etapes, v_evt), derniere_activite = now(), updated_at = now() WHERE id = p_id;
  ELSIF p_action = 'reattribuer' THEN
    IF p_responsable IS NULL OR p_responsable NOT IN ('steeve', 'routine-chrome', 'routine-chatgpt', 'routine-surveillance', 'humain') THEN
      RAISE EXCEPTION 'Responsable invalide' USING ERRCODE = '22023';
    END IF;
    IF v.statut IN ('fait', 'annule') THEN RAISE EXCEPTION 'Tâche terminée' USING ERRCODE = '22023'; END IF;
    -- Le jeton est effacé : l'ancien exécutant ne peut plus ni prolonger ni terminer la tâche.
    UPDATE public.steeve_actions SET responsable = p_responsable, verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL,
           statut = CASE WHEN v.statut = 'en_cours' THEN 'a_faire' ELSE v.statut END,
           etapes = public.steeve_tache_evt(etapes, v_evt || jsonb_build_object('vers', p_responsable)), derniere_activite = now(), updated_at = now() WHERE id = p_id;
  ELSIF p_action = 'annuler' THEN
    IF v.statut IN ('fait', 'annule') THEN RAISE EXCEPTION 'Tâche terminée' USING ERRCODE = '22023'; END IF;
    UPDATE public.steeve_actions SET statut = 'annule', cancelled_by = auth.uid(), verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL,
           etapes = public.steeve_tache_evt(etapes, v_evt), derniere_activite = now(), updated_at = now() WHERE id = p_id;
  ELSIF p_action IN ('confirmer_envoye', 'confirmer_non_envoye') THEN
    IF v.statut <> 'resultat_inconnu' THEN RAISE EXCEPTION 'Seulement pour un résultat inconnu' USING ERRCODE = '22023'; END IF;
    UPDATE public.steeve_actions
       SET statut = CASE WHEN p_action = 'confirmer_envoye' THEN (CASE WHEN v.kind = 'demande_qr' THEN 'en_attente_formulaire' WHEN v.kind IN ('demande_visite', 'relance_annonceur') THEN 'en_attente_regie' ELSE 'fait' END) ELSE 'a_faire' END,
           source = CASE WHEN p_action = 'confirmer_non_envoye' AND v.source = 'auto' THEN 'admin' ELSE v.source END,
           preuve = CASE WHEN p_action = 'confirmer_envoye' THEN coalesce(v.preuve, 'Envoi confirmé par l''administrateur') ELSE v.preuve END,
           etape = NULL, verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL,
           etapes = public.steeve_tache_evt(etapes, v_evt), derniere_activite = now(), updated_at = now()
     WHERE id = p_id;
    IF p_action = 'confirmer_envoye' AND v.kind = 'envoi_dossier' AND v.offre_id IS NOT NULL THEN
      PERFORM public.steeve_record_dossier_envoye(v.offre_id, v.client_id, v.destinataire, v.objet, coalesce(v.preuve, 'confirmé par l''administrateur'), NULL);
    END IF;
  ELSE
    RAISE EXCEPTION 'Action inconnue' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object('ok', true, 'id', p_id, 'action', p_action);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_tache_controle(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_tache_controle(uuid, text, text, text) TO authenticated;

-- 6) Formulaire (QR / lien) reçu, par n'importe quel canal : la demande qui attendait est close, celle qui
--    n'est pas encore partie est annulée (raison tracée). Une demande en cours d'envoi n'est jamais touchée.
CREATE OR REPLACE FUNCTION public.steeve_formulaire_recu(p_offre_id uuid, p_client_id uuid, p_canal text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed integer;
  v_cancelled integer;
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  UPDATE public.steeve_actions
     SET statut = 'fait', note = 'Formulaire reçu (' || coalesce(p_canal, '?') || ') le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
         derniere_activite = now(), updated_at = now(),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'formulaire_recu', 'canal', p_canal))
   WHERE kind = 'demande_qr' AND offre_id = p_offre_id AND client_id = p_client_id AND statut = 'en_attente_formulaire';
  GET DIAGNOSTICS v_closed = ROW_COUNT;
  UPDATE public.steeve_actions
     SET statut = 'annule', motif = 'Envoi inutile : formulaire déjà reçu (' || coalesce(p_canal, '?') || ').',
         derniere_activite = now(), updated_at = now(),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'annule', 'raison', 'formulaire_recu', 'canal', p_canal))
   WHERE kind = 'demande_qr' AND offre_id = p_offre_id AND client_id = p_client_id
     AND statut IN ('a_faire', 'bloque', 'bloque_acces', 'echec')
     AND (verrou_jusqu IS NULL OR verrou_jusqu <= now());
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;
  RETURN jsonb_build_object('closes', v_closed, 'annulees', v_cancelled);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_formulaire_recu(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_formulaire_recu(uuid, uuid, text) TO authenticated, service_role;

-- Lien de la demande de location reçu par e-mail (lot 5) : rangé comme avant, puis les demandes sont closes.
CREATE OR REPLACE FUNCTION public.steeve_apply_lien(p_offre_id uuid, p_client_id uuid, p_lien text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visite uuid;
  v_line text;
BEGIN
  IF p_lien !~* '^https://[a-z0-9.-]+\.[a-z]{2,}/' OR length(p_lien) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'lien invalide');
  END IF;
  SELECT id INTO v_visite FROM public.visites WHERE offre_id = p_offre_id AND client_id = p_client_id
   AND coalesce(statut, '') <> 'annulee' ORDER BY date_visite LIMIT 1;
  IF v_visite IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'aucune visite');
  END IF;
  v_line := 'Lien de la demande de location reçu de la régie le ' || to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') || ' : ' || p_lien;
  UPDATE public.visites
     SET compte_rendu = jsonb_set(coalesce(compte_rendu, '{}'::jsonb), '{autres_infos}',
           to_jsonb(trim(both E'\n' FROM coalesce(compte_rendu ->> 'autres_infos', '') || E'\n' || v_line))),
         updated_at = now()
   WHERE id = v_visite AND position(p_lien IN coalesce(compte_rendu ->> 'autres_infos', '')) = 0;
  PERFORM public.steeve_formulaire_recu(p_offre_id, p_client_id, 'email');
  RETURN jsonb_build_object('ok', true, 'visite_id', v_visite);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_apply_lien(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_apply_lien(uuid, uuid, text) TO service_role;

-- 7) État réel d'un dossier de candidature (client + bien) : sert de point de reprise.
--    Le dernier rapport (triage de la postulation) est un point de départ ; les traces plus récentes priment.
CREATE OR REPLACE FUNCTION public.steeve_dossier_etat(p_offre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v_job record;
  v_visite record;
  v_cand record;
  v_envoi record;
  v_lock record;
  v_flatfox boolean;
  v_qr boolean;
  v_situation text;
  v_prochaine text;
BEGIN
  SELECT ofr.id, ofr.client_id, ofr.adresse, ofr.statut, ofr.lien_annonce, ofr.updated_at, c.user_id
    INTO o FROM public.offres ofr JOIN public.clients c ON c.id = ofr.client_id WHERE ofr.id = p_offre_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('situation', 'introuvable');
  END IF;
  -- L'attestation RC ménage n'est jamais bloquante : retirée des pièces manquantes.
  SELECT status, attempt_count, last_error, updated_at, processed_at,
         (SELECT coalesce(jsonb_agg(e), '[]'::jsonb) FROM jsonb_array_elements_text(coalesce(ai_result -> 'ai' -> 'missing_items', ai_result -> 'missing_items', '[]'::jsonb)) e
           WHERE e !~* '(\mRC\M|responsabilit[eé] civile)') AS manquantes,
         left(ai_result -> 'ai' ->> 'concise_staff_summary', 400) AS rapport
    INTO v_job FROM public.postulation_jobs WHERE offre_id = o.id AND client_id = o.client_id;
  SELECT date_visite, statut, (coalesce(compte_rendu ->> 'autres_infos', '') || ' ' || coalesce(compte_rendu ->> 'contact_regie', '')) AS cr
    INTO v_visite FROM public.visites WHERE offre_id = o.id AND client_id = o.client_id AND coalesce(statut, '') <> 'annulee'
   ORDER BY date_visite DESC NULLS LAST LIMIT 1;
  SELECT statut, date_depot INTO v_cand FROM public.candidatures WHERE offre_id = o.id AND client_id = o.client_id ORDER BY created_at DESC LIMIT 1;
  SELECT id, statut, preuve, executed_at, destinataire, motif INTO v_envoi FROM public.steeve_actions
   WHERE offre_id = o.id AND kind = 'envoi_dossier' AND statut NOT IN ('annule', 'a_blanc')
   ORDER BY (statut = 'fait') DESC, created_at DESC LIMIT 1;
  SELECT id, kind, verrou_par, verrou_jusqu INTO v_lock FROM public.steeve_actions
   WHERE offre_id = o.id AND verrou_jusqu > now() ORDER BY verrou_jusqu DESC LIMIT 1;
  v_flatfox := coalesce(o.lien_annonce, '') ILIKE '%flatfox.ch%';
  v_qr := coalesce(v_visite.cr, '') ~* '(\mqr\M|qr-code|qrcode|flatfox\.ch/[a-z]{2}/(apply|application|bewerbung|candidature|anmeldung))';

  IF public.steeve_dossier_deja_envoye(o.id, o.client_id) OR o.statut IN ('candidature_deposee', 'acceptee') THEN
    v_situation := 'deja_envoye'; v_prochaine := 'Suivre la réponse de la régie (aucun renvoi).';
  ELSIF v_envoi.statut = 'resultat_inconnu' THEN
    v_situation := 'resultat_inconnu'; v_prochaine := 'Vérifier les envoyés de relocation@ avant toute nouvelle tentative.';
  ELSIF v_lock.id IS NOT NULL THEN
    v_situation := 'en_cours_ailleurs'; v_prochaine := 'Attendre la fin de l''exécutant en cours (' || v_lock.verrou_par || ').';
  ELSIF v_envoi.statut IN ('a_faire', 'en_cours') THEN
    v_situation := 'envoi_programme'; v_prochaine := 'Contrôle puis envoi du brouillon de relocation@.';
  ELSIF v_job.status = 'blocked' AND jsonb_array_length(coalesce(v_job.manquantes, '[]'::jsonb)) > 0 THEN
    v_situation := 'piece_manquante'; v_prochaine := 'Demander les pièces manquantes au client ; le reste peut avancer.';
  ELSIF v_flatfox AND v_visite.date_visite IS NOT NULL AND v_visite.date_visite < now() AND NOT v_qr THEN
    v_situation := 'formulaire_manquant'; v_prochaine := 'Demander le QR code / formulaire (chat Flatfox et e-mail visites@).';
  ELSIF v_job.status IN ('queued', 'processing') THEN
    v_situation := 'preparation_en_cours'; v_prochaine := 'Préparation du dossier en cours (triage puis routine Postulation).';
  ELSIF v_job.status IN ('ready', 'completed', 'blocked') OR v_envoi.statut IN ('bloque', 'echec', 'bloque_acces') THEN
    v_situation := 'pret_a_controler'; v_prochaine := 'Contrôler le brouillon de relocation@ puis l''envoyer.';
  ELSE
    v_situation := 'aucune_tache'; v_prochaine := 'Créer la demande de postulation et commencer la préparation.';
  END IF;

  RETURN jsonb_build_object(
    'situation', v_situation,
    'prochaine_etape', v_prochaine,
    'offre', jsonb_build_object('id', o.id, 'adresse', o.adresse, 'statut', o.statut, 'flatfox', v_flatfox, 'maj', o.updated_at),
    'client', jsonb_build_object('id', o.client_id, 'nom', public.steeve_person_name(o.user_id)),
    'visite', CASE WHEN v_visite.date_visite IS NULL THEN NULL ELSE jsonb_build_object('le', v_visite.date_visite, 'statut', v_visite.statut, 'formulaire_connu', v_qr) END,
    'postulation', CASE WHEN v_job.status IS NULL THEN NULL ELSE jsonb_build_object('statut', v_job.status, 'pieces_manquantes', v_job.manquantes,
                         'rapport', v_job.rapport, 'rapport_du', coalesce(v_job.processed_at, v_job.updated_at), 'erreur', nullif(v_job.last_error, '')) END,
    'candidature', CASE WHEN v_cand.statut IS NULL THEN NULL ELSE jsonb_build_object('statut', v_cand.statut, 'deposee_le', v_cand.date_depot) END,
    'envoi', CASE WHEN v_envoi.id IS NULL THEN NULL ELSE jsonb_build_object('id', v_envoi.id, 'statut', v_envoi.statut, 'preuve', v_envoi.preuve,
                    'le', v_envoi.executed_at, 'destinataire', v_envoi.destinataire, 'motif', v_envoi.motif) END,
    'verrou', CASE WHEN v_lock.id IS NULL THEN NULL ELSE jsonb_build_object('tache', v_lock.kind, 'par', v_lock.verrou_par, 'jusqu', v_lock.verrou_jusqu) END,
    'taches', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'canal', a.canal, 'statut', a.statut, 'responsable', a.responsable,
                     'motif', a.motif, 'preuve', a.preuve, 'le', a.created_at) ORDER BY a.created_at DESC), '[]'::jsonb)
                 FROM (SELECT * FROM public.steeve_actions WHERE offre_id = o.id AND statut <> 'a_blanc' ORDER BY created_at DESC LIMIT 12) a)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_dossier_etat(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_dossier_etat(uuid) TO service_role;

-- Recherche par l'équipe : client (nom, prénom ou les deux) + bien (adresse, référence ou nom d'annonce).
CREATE OR REPLACE FUNCTION public.staff_steeve_dossier_etat(p_client text, p_bien text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens text[];
  v_bien text := lower(trim(coalesce(p_bien, '')));
  v_matches jsonb;
  v_n integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  v_tokens := array_remove(regexp_split_to_array(lower(trim(coalesce(p_client, ''))), '\s+'), '');
  IF coalesce(array_length(v_tokens, 1), 0) = 0 OR length(v_bien) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'situation', 'precisions', 'motif', 'Préciser le client et le bien (adresse, référence ou nom de l''annonce).');
  END IF;
  SELECT coalesce(jsonb_agg(m), '[]'::jsonb), count(*) INTO v_matches, v_n FROM (
    SELECT o.id AS offre_id, public.steeve_person_name(c.user_id) AS client, o.adresse, o.statut, o.updated_at AS maj
      FROM public.offres o
      JOIN public.clients c ON c.id = o.client_id
      JOIN public.profiles p ON p.id = c.user_id
     WHERE coalesce(o.statut, '') <> 'doublon'
       AND public.steeve_staff_can_handle(o.client_id)
       AND NOT EXISTS (SELECT 1 FROM unnest(v_tokens) t WHERE position(t IN lower(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, ''))) = 0)
       AND (lower(coalesce(o.adresse, '')) LIKE '%' || v_bien || '%'
            OR lower(coalesce(o.lien_annonce, '')) LIKE '%' || replace(v_bien, ' ', '-') || '%'
            OR EXISTS (SELECT 1 FROM public.contacts_annonceurs ca WHERE ca.offre_id = o.id AND lower(coalesce(ca.reference, '')) = v_bien))
     ORDER BY o.updated_at DESC
     LIMIT 6) m;
  IF v_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'situation', 'introuvable', 'motif', 'Aucune offre de ce client ne correspond à ce bien.');
  ELSIF v_n > 1 THEN
    RETURN jsonb_build_object('ok', false, 'situation', 'ambigu', 'motif', 'Plusieurs dossiers correspondent : lequel ?', 'choix', v_matches);
  END IF;
  RETURN jsonb_build_object('ok', true) || public.steeve_dossier_etat((v_matches -> 0 ->> 'offre_id')::uuid);
END;
$$;
REVOKE ALL ON FUNCTION public.staff_steeve_dossier_etat(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_steeve_dossier_etat(text, text) TO authenticated;

-- Tâche idempotente du registre (clé métier = action + canal + bien + client).
CREATE OR REPLACE FUNCTION public.steeve_tache_creer(p_kind text, p_canal text, p_offre_id uuid, p_client_id uuid, p_source text,
                                                    p_responsable text DEFAULT 'steeve', p_note text DEFAULT NULL, p_by uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := p_kind || ':' || coalesce(p_canal, '-') || ':' || coalesce(p_offre_id::text, '-') || ':' || coalesce(p_client_id::text, '-');
  v_id uuid;
  v_statut text;
BEGIN
  -- Même demande déjà ouverte ou déjà faite : rien en double.
  SELECT id, statut INTO v_id, v_statut FROM public.steeve_actions
   WHERE (idempotency_key = v_key OR (kind = p_kind AND coalesce(canal, '-') = coalesce(p_canal, '-') AND offre_id IS NOT DISTINCT FROM p_offre_id
          AND client_id IS NOT DISTINCT FROM p_client_id))
     AND statut NOT IN ('annule', 'echec', 'a_blanc', 'bloque_acces')
   ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_id, 'existante', true, 'statut', v_statut);
  END IF;
  -- Échec franc (refus du serveur), accès bloqué ou tâche annulée puis redemandée : la même ligne est relancée.
  UPDATE public.steeve_actions
     SET statut = 'a_faire', motif = NULL, verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL,
         source = CASE WHEN source = 'auto' THEN p_source ELSE source END, derniere_activite = now(), updated_at = now(),
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'relancee', 'source', p_source))
   WHERE idempotency_key = v_key AND statut IN ('echec', 'bloque_acces', 'annule')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_id, 'existante', true, 'relancee', true, 'statut', 'a_faire');
  END IF;
  INSERT INTO public.steeve_actions (kind, canal, source, requested_by, client_id, offre_id, statut, responsable, note, idempotency_key,
                                     mailbox, version_regles, etapes)
  VALUES (p_kind, p_canal, p_source, p_by, p_client_id, p_offre_id, 'a_faire', p_responsable, left(nullif(trim(p_note), ''), 500), v_key,
          CASE WHEN p_canal = 'flatfox' THEN 'flatfox' WHEN p_kind = 'envoi_dossier' THEN 'relocation@immo-rama.ch'
               WHEN p_kind IN ('demande_qr', 'demande_visite', 'relance_annonceur') THEN 'visites@immo-rama.ch' END,
          (SELECT value FROM public.app_config WHERE key = 'steeve_version_regles'),
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'creee', 'source', p_source)))
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id, statut INTO v_id, v_statut FROM public.steeve_actions WHERE idempotency_key = v_key;
    RETURN jsonb_build_object('id', v_id, 'existante', true, 'statut', v_statut);
  END IF;
  RETURN jsonb_build_object('id', v_id, 'existante', false, 'statut', 'a_faire');
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_tache_creer(text, text, uuid, uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_tache_creer(text, text, uuid, uuid, text, text, text, uuid) TO service_role;

-- Reprise d'un dossier par l'équipe : fait seulement ce qui reste, sans rien refaire.
CREATE OR REPLACE FUNCTION public.staff_steeve_reprendre_dossier(p_offre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_etat jsonb;
  v_sit text;
  v_uid uuid := auth.uid();
  v_source text := CASE WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN 'admin' ELSE 'agent' END;
  v_actions jsonb := '[]'::jsonb;
  v_r jsonb;
  v_has_email boolean;
BEGIN
  SELECT client_id INTO v_client FROM public.offres WHERE id = p_offre_id;
  IF v_client IS NULL OR NOT public.steeve_staff_can_handle(v_client) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  v_etat := public.steeve_dossier_etat(p_offre_id);
  v_sit := v_etat ->> 'situation';
  v_has_email := coalesce(array_length(public.steeve_emails_regie(p_offre_id), 1), 0) > 0;

  IF v_sit IN ('deja_envoye', 'resultat_inconnu', 'en_cours_ailleurs', 'envoi_programme', 'preparation_en_cours') THEN
    RETURN jsonb_build_object('ok', true, 'etat', v_etat, 'actions', v_actions);
  END IF;

  IF v_sit = 'aucune_tache' THEN
    BEGIN
      v_r := public.steeve_request_postulation(v_client, p_offre_id);
      v_actions := v_actions || jsonb_build_array(jsonb_build_object('action', 'postulation_demandee', 'resultat', v_r));
    EXCEPTION WHEN OTHERS THEN
      v_actions := v_actions || jsonb_build_array(jsonb_build_object('action', 'postulation_demandee', 'erreur', SQLERRM));
    END;
    -- steeve_request_postulation agit au nom du client : l'identité de l'équipe est rétablie aussitôt.
    PERFORM set_config('request.jwt.claim.sub', coalesce(v_uid::text, ''), true);
  END IF;

  -- Formulaire manquant (bien Flatfox, visite passée) : les deux canaux, suivis séparément.
  IF v_sit = 'formulaire_manquant' OR (v_sit IN ('aucune_tache', 'piece_manquante') AND (v_etat -> 'offre' ->> 'flatfox')::boolean
                                        AND (v_etat -> 'visite') IS NOT NULL AND NOT coalesce((v_etat -> 'visite' ->> 'formulaire_connu')::boolean, false)
                                        AND (v_etat -> 'visite' ->> 'le')::timestamptz < now()) THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object('action', 'demande_formulaire_flatfox',
      'tache', public.steeve_tache_creer('demande_qr', 'flatfox', p_offre_id, v_client, v_source, 'routine-chrome', NULL, v_uid)));
    IF v_has_email THEN
      v_actions := v_actions || jsonb_build_array(jsonb_build_object('action', 'demande_formulaire_email',
        'tache', public.steeve_tache_creer('demande_qr', 'email', p_offre_id, v_client, v_source, 'steeve', NULL, v_uid)));
    ELSE
      v_actions := v_actions || jsonb_build_array(jsonb_build_object('action', 'demande_formulaire_email', 'bloque', 'Aucune adresse vérifiée de la régie ou de l''annonceur.'));
    END IF;
  END IF;

  IF v_sit = 'piece_manquante' THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object('action', 'demande_pieces',
      'tache', public.steeve_tache_creer('demande_piece', 'app', p_offre_id, v_client, v_source, 'steeve', NULL, v_uid),
      'pieces', v_etat -> 'postulation' -> 'pieces_manquantes'));
  END IF;

  IF v_sit = 'pret_a_controler' THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object('action', 'envoi_dossier',
      'tache', public.steeve_tache_creer('envoi_dossier', 'email', p_offre_id, v_client, v_source, 'steeve', NULL, v_uid)));
  END IF;

  RETURN jsonb_build_object('ok', true, 'etat', v_etat, 'actions', v_actions);
END;
$$;
REVOKE ALL ON FUNCTION public.staff_steeve_reprendre_dossier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_steeve_reprendre_dossier(uuid) TO authenticated;

-- 8) Actions demandées par un client à Steeve (appelées par le serveur pour CE client uniquement).
-- Offres du client correspondant à un texte (adresse, ville, référence) : jamais celles d'un autre client.
CREATE OR REPLACE FUNCTION public.steeve_client_offres_match(p_client_id uuid, p_ref text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(m), '[]'::jsonb) FROM (
    SELECT o.id AS offre_id, o.adresse, o.statut, o.prix, o.pieces
      FROM public.offres o
     WHERE o.client_id = p_client_id AND coalesce(o.statut, '') <> 'doublon'
       AND length(trim(coalesce(p_ref, ''))) >= 2
       AND (o.id::text = trim(p_ref) OR lower(coalesce(o.adresse, '')) LIKE '%' || lower(trim(p_ref)) || '%')
     ORDER BY coalesce(o.date_envoi, o.updated_at) DESC
     LIMIT 5) m;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_offres_match(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_offres_match(uuid, text) TO service_role;

-- Réponse du client à une offre (comme les boutons de l'application) : intéressé ou refus.
CREATE OR REPLACE FUNCTION public.steeve_client_reponse_offre(p_client_id uuid, p_offre_id uuid, p_reponse text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statut text;
  v_new text := CASE p_reponse WHEN 'interesse' THEN 'interesse' WHEN 'refuse' THEN 'refusee' END;
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
  -- Après une candidature, une visite fixée ou une décision : on ne réécrit pas l'historique.
  IF v_statut NOT IN ('envoyee', 'interesse', 'refusee') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Cette offre est déjà plus loin (' || v_statut || ') : la réponse se gère avec ton agent.');
  END IF;
  UPDATE public.offres SET statut = v_new, updated_at = now() WHERE id = p_offre_id;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, offre_id, statut, responsable, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('reponse_offre', 'app', 'client', p_client_id, p_offre_id, 'fait', 'steeve', 'Réponse du client à Steeve : ' || v_new, now(),
          'offres.statut ' || v_statut || ' → ' || v_new, 'reponse_offre:' || p_offre_id || ':' || v_new || ':' || extract(epoch FROM now())::bigint,
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')));
  RETURN jsonb_build_object('ok', true, 'statut', v_new, 'avant', v_statut);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_reponse_offre(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_reponse_offre(uuid, uuid, text) TO service_role;

-- Demande de visite : la tâche part depuis visites@ (ou le chat Flatfox via la routine), une seule par bien.
CREATE OR REPLACE FUNCTION public.steeve_client_demande_visite(p_client_id uuid, p_offre_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v_canal text;
  v_resp text;
  v_r jsonb;
BEGIN
  SELECT id, statut, lien_annonce INTO o FROM public.offres WHERE id = p_offre_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Offre introuvable dans ton dossier.');
  END IF;
  IF o.statut IN ('refusee', 'doublon', 'candidature_deposee', 'acceptee') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Pas de demande de visite possible pour cette offre (' || o.statut || ').');
  END IF;
  IF EXISTS (SELECT 1 FROM public.visites v WHERE v.offre_id = p_offre_id AND v.client_id = p_client_id
              AND coalesce(v.statut, '') NOT IN ('annulee') AND (v.date_visite IS NULL OR v.date_visite > now())) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Une visite est déjà prévue ou en cours d''organisation pour ce bien.', 'deja', true);
  END IF;
  IF coalesce(array_length(public.steeve_emails_regie(p_offre_id), 1), 0) > 0 THEN
    v_canal := 'email'; v_resp := 'steeve';
  ELSIF coalesce(o.lien_annonce, '') ILIKE '%flatfox.ch%' THEN
    v_canal := 'flatfox'; v_resp := 'routine-chrome';
  ELSE
    v_canal := 'email'; v_resp := 'steeve'; -- sans destinataire vérifié, l'opérateur bloquera seulement ce canal
  END IF;
  v_r := public.steeve_tache_creer('demande_visite', v_canal, p_offre_id, p_client_id, 'client', v_resp, p_note, NULL);
  IF o.statut = 'envoyee' THEN
    UPDATE public.offres SET statut = 'interesse', updated_at = now() WHERE id = p_offre_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'canal', v_canal) || v_r;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_demande_visite(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_demande_visite(uuid, uuid, text) TO service_role;

-- Critères de recherche modifiés sur demande explicite du client (bornes contrôlées, avant/après tracés).
CREATE OR REPLACE FUNCTION public.steeve_client_criteres(p_client_id uuid, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  v_budget numeric := nullif(p_changes ->> 'budget_max', '')::numeric;
  v_pieces numeric := nullif(p_changes ->> 'pieces', '')::numeric;
  v_region text := nullif(trim(p_changes ->> 'region_recherche'), '');
  v_type text := nullif(trim(p_changes ->> 'type_bien'), '');
  v_souhaits text := nullif(trim(p_changes ->> 'souhaits_particuliers'), '');
  v_avant jsonb;
  v_apres jsonb;
BEGIN
  SELECT budget_max, pieces, region_recherche, type_bien, souhaits_particuliers INTO c FROM public.clients WHERE id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Dossier introuvable.');
  END IF;
  IF v_budget IS NOT NULL AND (v_budget < 300 OR v_budget > 30000) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Budget hors des bornes (300 à 30 000 CHF par mois).');
  END IF;
  IF v_pieces IS NOT NULL AND (v_pieces < 1 OR v_pieces > 12 OR (v_pieces * 2) <> floor(v_pieces * 2)) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Nombre de pièces invalide (1 à 12, par demi-pièce).');
  END IF;
  IF v_type IS NOT NULL AND v_type NOT IN ('Appartement', 'Villa & maison', 'Maison', 'Studio', 'Chambre', 'Local commercial', 'Autre') THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Type de bien non reconnu.');
  END IF;
  IF v_budget IS NULL AND v_pieces IS NULL AND v_region IS NULL AND v_type IS NULL AND v_souhaits IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Aucun changement précisé.');
  END IF;
  v_avant := jsonb_build_object('budget_max', c.budget_max, 'pieces', c.pieces, 'region_recherche', c.region_recherche, 'type_bien', c.type_bien, 'souhaits_particuliers', c.souhaits_particuliers);
  UPDATE public.clients
     SET budget_max = coalesce(v_budget, budget_max), pieces = coalesce(v_pieces, pieces),
         region_recherche = coalesce(left(v_region, 300), region_recherche), type_bien = coalesce(v_type, type_bien),
         souhaits_particuliers = coalesce(left(v_souhaits, 1000), souhaits_particuliers), updated_at = now()
   WHERE id = p_client_id
  RETURNING jsonb_build_object('budget_max', budget_max, 'pieces', pieces, 'region_recherche', region_recherche, 'type_bien', type_bien, 'souhaits_particuliers', souhaits_particuliers)
  INTO v_apres;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, statut, responsable, controles, note, executed_at, preuve, idempotency_key, etapes)
  VALUES ('changement_criteres', 'app', 'client', p_client_id, 'fait', 'steeve', jsonb_build_object('avant', v_avant, 'apres', v_apres),
          'Critères modifiés à la demande du client', now(), 'clients mis à jour',
          'criteres:' || p_client_id || ':' || extract(epoch FROM clock_timestamp())::text,
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', 'fait')));
  RETURN jsonb_build_object('ok', true, 'avant', v_avant, 'apres', v_apres);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_criteres(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_criteres(uuid, jsonb) TO service_role;

-- 9) Vue administrateur : tâches avec étape, responsable, verrou, tentatives, canal et historique.
CREATE OR REPLACE FUNCTION public.admin_steeve_operateur(p_limit integer DEFAULT 30, p_statut text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text := coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_autonomie'), 'off');
  v_since timestamptz := nullif((SELECT value FROM public.app_config WHERE key = 'steeve_autonomie_depuis'), '')::timestamptz;
  v_day timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'mode', v_mode,
    'depuis', v_since,
    'autonome_le', NULL,
    'boites', (SELECT coalesce(jsonb_agg(jsonb_build_object('adresse', m.address, 'branchee', m.secret_id IS NOT NULL,
                         'lecture_active', m.is_active) ORDER BY m.address), '[]'::jsonb)
                 FROM public.shared_mailboxes m WHERE m.address IN ('visites@immo-rama.ch', 'relocation@immo-rama.ch')),
    'aujourdhui', (SELECT coalesce(jsonb_object_agg(statut, n), '{}'::jsonb)
                     FROM (SELECT statut, count(*) n FROM public.steeve_actions WHERE created_at >= v_day GROUP BY statut) s),
    'ouvertes', (SELECT coalesce(jsonb_object_agg(statut, n), '{}'::jsonb)
                   FROM (SELECT statut, count(*) n FROM public.steeve_actions
                          WHERE statut IN ('a_faire', 'en_cours', 'en_attente_client', 'en_attente_formulaire', 'en_attente_regie', 'resultat_inconnu', 'suspendu', 'bloque', 'bloque_acces')
                          GROUP BY statut) s),
    'actions', (SELECT coalesce(jsonb_agg(a ORDER BY a.created_at DESC), '[]'::jsonb) FROM (
      SELECT sa.id, sa.created_at, sa.kind, sa.source, sa.statut, sa.mailbox, sa.destinataire, sa.objet,
             left(sa.corps, 1500) AS corps, sa.pieces, sa.controles, sa.motif, sa.preuve, sa.note, sa.executed_at,
             sa.client_id, sa.offre_id, public.steeve_person_name(c.user_id) AS client_nom, o.adresse AS bien,
             sa.canal, sa.responsable, sa.etape, sa.etapes, sa.tentatives, sa.verrou_par, sa.verrou_jusqu, sa.derniere_activite, sa.echeance
        FROM public.steeve_actions sa
        LEFT JOIN public.clients c ON c.id = sa.client_id
        LEFT JOIN public.offres o ON o.id = sa.offre_id
       WHERE p_statut IS NULL OR p_statut = '' OR sa.statut = p_statut
       ORDER BY sa.created_at DESC
       LIMIT least(greatest(coalesce(p_limit, 30), 1), 200)) a)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_steeve_operateur(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_steeve_operateur(integer, text) TO authenticated;

-- L'annulation par l'équipe couvre aussi les nouveaux statuts d'attente (jamais une tâche terminée).
CREATE OR REPLACE FUNCTION public.staff_cancel_steeve_action(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.steeve_actions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.steeve_actions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR NOT (public.has_role(auth.uid(), 'admin'::app_role)
                       OR (v_row.client_id IS NOT NULL AND public.steeve_staff_can_handle(v_row.client_id))) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF v_row.statut NOT IN ('a_faire', 'a_valider', 'bloque', 'bloque_acces', 'a_blanc', 'suspendu', 'en_attente_client', 'en_attente_formulaire', 'en_attente_regie') THEN
    RAISE EXCEPTION 'Action déjà exécutée ou en cours' USING ERRCODE = '22023';
  END IF;
  UPDATE public.steeve_actions SET statut = 'annule', cancelled_by = auth.uid(), updated_at = now(), derniere_activite = now(),
         verrou_par = NULL, verrou_jeton = NULL, verrou_jusqu = NULL,
         etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'annule', 'par', auth.uid()))
   WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'statut', 'annule');
END;
$$;
REVOKE ALL ON FUNCTION public.staff_cancel_steeve_action(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_cancel_steeve_action(uuid) TO authenticated;

-- 10) Raccord de la routine ChatGPT (outils MCP, compte automation_operator) : elle voit l'état du registre
--     pour ses offres (rien n'est refait) et signale l'avancement ; « brouillon prêt » crée la tâche d'envoi de Steeve.
CREATE OR REPLACE FUNCTION public.steeve_registre_offres(p_offre_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT coalesce(jsonb_object_agg(o.id, jsonb_build_object(
      'deja_envoye', public.steeve_dossier_deja_envoye(o.id, o.client_id),
      'envoi', (SELECT jsonb_build_object('statut', a.statut, 'le', coalesce(a.executed_at, a.updated_at), 'motif', a.motif)
                  FROM public.steeve_actions a WHERE a.offre_id = o.id AND a.kind = 'envoi_dossier' AND a.statut NOT IN ('annule', 'a_blanc')
                 ORDER BY (a.statut = 'fait') DESC, a.created_at DESC LIMIT 1),
      'en_cours_par', (SELECT a.verrou_par FROM public.steeve_actions a WHERE a.offre_id = o.id AND a.verrou_jusqu > now() LIMIT 1),
      'formulaire', (SELECT coalesce(jsonb_agg(jsonb_build_object('canal', a.canal, 'statut', a.statut)), '[]'::jsonb)
                       FROM public.steeve_actions a WHERE a.offre_id = o.id AND a.kind = 'demande_qr' AND a.statut NOT IN ('annule', 'a_blanc')))), '{}'::jsonb)
    FROM public.offres o WHERE o.id = ANY (p_offre_ids[1:100]));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_registre_offres(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_registre_offres(uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.steeve_routine_signaler(p_offre_id uuid, p_etape text, p_note text DEFAULT NULL, p_routine text DEFAULT 'routine-chatgpt')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_r jsonb;
BEGIN
  IF NOT public.steeve_executant_autorise() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_etape NOT IN ('pdf_prepare', 'brouillon_pret', 'bloque') OR p_routine NOT IN ('routine-chatgpt', 'routine-chrome', 'routine-surveillance') THEN
    RAISE EXCEPTION 'Étape ou routine invalide' USING ERRCODE = '22023';
  END IF;
  SELECT client_id INTO v_client FROM public.offres WHERE id = p_offre_id;
  IF v_client IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'offre introuvable');
  END IF;
  IF public.steeve_dossier_deja_envoye(p_offre_id, v_client) THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'deja_envoye', 'consigne', 'Dossier déjà envoyé : ne rien refaire.');
  END IF;
  IF p_etape = 'brouillon_pret' THEN
    -- Un seul exécutant pour l'envoi des brouillons de relocation@ : Steeve (contrôles puis envoi).
    v_r := public.steeve_tache_creer('envoi_dossier', 'email', p_offre_id, v_client, 'routine', 'steeve', p_note, NULL);
    UPDATE public.steeve_actions
       SET etapes = public.steeve_tache_evt(etapes, jsonb_build_object('le', now(), 'evt', 'brouillon_pret', 'par', p_routine, 'note', left(p_note, 300))),
           derniere_activite = now(), updated_at = now()
     WHERE id = (v_r ->> 'id')::uuid;
    RETURN jsonb_build_object('ok', true, 'tache', v_r, 'suite', 'Steeve contrôle le brouillon de relocation@ puis l''envoie (7 h – 20 h).');
  END IF;
  INSERT INTO public.steeve_actions (kind, canal, source, client_id, offre_id, statut, responsable, note, executed_at, idempotency_key, etapes)
  VALUES ('reprise_dossier', 'interne', 'routine', v_client, p_offre_id, CASE WHEN p_etape = 'bloque' THEN 'bloque' ELSE 'fait' END, p_routine,
          left(coalesce(p_note, p_etape), 500), now(), 'routine:' || p_etape || ':' || p_offre_id || ':' || extract(epoch FROM clock_timestamp())::text,
          jsonb_build_array(jsonb_build_object('le', now(), 'evt', p_etape, 'par', p_routine)));
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_routine_signaler(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_routine_signaler(uuid, text, text, text) TO authenticated, service_role;
