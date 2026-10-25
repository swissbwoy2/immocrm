-- Steeve opérateur (lot 4) : Steeve exécute lui-même les tâches sûres des routines (demandes de QR Flatfox,
-- relances oubliées, contrôle puis envoi des dossiers préparés) et laisse un journal de chaque action.
-- Additive et idempotente.
--
-- Garde-fous :
--  • Mode réglé par l'admin : 'off' (rien), 'a_blanc' (tout est contrôlé et journalisé, rien n'est envoyé),
--    'autonome' (envoi réel). Le mode 'a_blanc' passe seul en 'autonome' 48 h après le premier passage
--    où une boîte d'envoi est branchée. Le bouton Stop remet 'off' immédiatement.
--  • Chaque action a une clé unique : jamais deux fois la même demande, relance ou candidature.
--  • Les sujets sensibles (bail, signature, dossier retenu, paiement, litige, question d'une régie) restent à l'humain.

-- 1) Journal des actions
CREATE TABLE IF NOT EXISTS public.steeve_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  source text NOT NULL DEFAULT 'auto',
  requested_by uuid,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  offre_id uuid REFERENCES public.offres(id) ON DELETE SET NULL,
  mailbox text,
  destinataire text,
  objet text,
  corps text,
  pieces jsonb NOT NULL DEFAULT '[]'::jsonb,
  controles jsonb NOT NULL DEFAULT '{}'::jsonb,
  statut text NOT NULL DEFAULT 'a_faire',
  motif text,
  preuve text,
  note text,
  idempotency_key text,
  executed_at timestamptz,
  cancelled_by uuid,
  CONSTRAINT steeve_actions_kind_check CHECK (kind IN (
    'demande_qr', 'relance_annonceur', 'envoi_dossier', 'triage_postulations', 'demande_postulation', 'lecon')),
  CONSTRAINT steeve_actions_source_check CHECK (source IN ('auto', 'client', 'agent', 'admin')),
  -- a_faire : demandée, pas encore traitée ; a_blanc : contrôlée, aurait été envoyée (mode à blanc) ;
  -- fait : exécutée (preuve) ; bloque : un contrôle a échoué (motif) ; a_valider : réservée à l'humain ;
  -- annule : annulée par l'équipe ; echec : erreur technique.
  CONSTRAINT steeve_actions_statut_check CHECK (statut IN ('a_faire', 'a_blanc', 'fait', 'bloque', 'a_valider', 'annule', 'echec')),
  CONSTRAINT steeve_actions_corps_len CHECK (corps IS NULL OR length(corps) <= 8000),
  CONSTRAINT steeve_actions_motif_len CHECK (motif IS NULL OR length(motif) <= 500)
);
CREATE UNIQUE INDEX IF NOT EXISTS steeve_actions_idem_idx ON public.steeve_actions (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS steeve_actions_created_idx ON public.steeve_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS steeve_actions_todo_idx ON public.steeve_actions (statut, created_at) WHERE statut = 'a_faire';
CREATE INDEX IF NOT EXISTS steeve_actions_client_idx ON public.steeve_actions (client_id, created_at DESC);

ALTER TABLE public.steeve_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipe lit le journal de Steeve" ON public.steeve_actions;
CREATE POLICY "Equipe lit le journal de Steeve" ON public.steeve_actions
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (client_id IS NOT NULL AND public.steeve_staff_can_handle(client_id))
  );

-- 2) Réglages : mode à blanc par défaut (48 h de contrôle avant les envois réels)
INSERT INTO public.app_config (key, value, updated_at)
VALUES ('steeve_autonomie', 'a_blanc', now())
ON CONFLICT (key) DO NOTHING;

-- Mode effectif pour le serveur. p_mailbox_ready : une boîte d'envoi est branchée (démarre les 48 h).
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
  IF v_mode = 'a_blanc' AND v_since IS NOT NULL AND v_since <= now() - interval '48 hours' THEN
    v_mode := 'autonome';
    INSERT INTO public.app_config (key, value, updated_at) VALUES ('steeve_autonomie', 'autonome', now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  END IF;
  RETURN jsonb_build_object('mode', v_mode, 'depuis', v_since,
    'autonome_le', CASE WHEN v_mode = 'a_blanc' AND v_since IS NOT NULL THEN v_since + interval '48 hours' END);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_operator_mode(boolean) FROM PUBLIC, anon, authenticated;

-- 3) Pilotage par l'admin : mode, journal, état des boîtes d'envoi
CREATE OR REPLACE FUNCTION public.admin_set_steeve_autonomie(p_mode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_mode NOT IN ('off', 'a_blanc', 'autonome') THEN
    RAISE EXCEPTION 'Mode invalide' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.app_config (key, value, updated_at) VALUES ('steeve_autonomie', p_mode, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  -- Repasser à blanc relance une période de contrôle complète de 48 h.
  INSERT INTO public.app_config (key, value, updated_at)
  VALUES ('steeve_autonomie_depuis', CASE WHEN p_mode = 'autonome' THEN now()::text ELSE '' END, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  INSERT INTO public.steeve_actions (kind, source, requested_by, statut, note, executed_at)
  VALUES ('lecon', 'admin', auth.uid(), 'fait', 'Mode de Steeve réglé sur « ' || p_mode || ' »', now());
  RETURN public.admin_steeve_operateur(30, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_steeve_autonomie(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_steeve_autonomie(text) TO authenticated;

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
    'autonome_le', CASE WHEN v_mode = 'a_blanc' AND v_since IS NOT NULL THEN v_since + interval '48 hours' END,
    'boites', (SELECT coalesce(jsonb_agg(jsonb_build_object('adresse', m.address, 'branchee', m.secret_id IS NOT NULL,
                         'lecture_active', m.is_active) ORDER BY m.address), '[]'::jsonb)
                 FROM public.shared_mailboxes m WHERE m.address IN ('visites@immo-rama.ch', 'relocation@immo-rama.ch')),
    'aujourdhui', (SELECT coalesce(jsonb_object_agg(statut, n), '{}'::jsonb)
                     FROM (SELECT statut, count(*) n FROM public.steeve_actions WHERE created_at >= v_day GROUP BY statut) s),
    'actions', (SELECT coalesce(jsonb_agg(a ORDER BY a.created_at DESC), '[]'::jsonb) FROM (
      SELECT sa.id, sa.created_at, sa.kind, sa.source, sa.statut, sa.mailbox, sa.destinataire, sa.objet,
             left(sa.corps, 1500) AS corps, sa.pieces, sa.controles, sa.motif, sa.preuve, sa.note, sa.executed_at,
             sa.client_id, sa.offre_id, public.steeve_person_name(c.user_id) AS client_nom, o.adresse AS bien
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

-- 4) Tâches demandées par l'équipe (copilote, tableau de bord) : exécutées au prochain passage de Steeve
CREATE OR REPLACE FUNCTION public.staff_request_steeve_task(p_kind text, p_offre_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_id uuid;
  v_source text := CASE WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN 'admin' ELSE 'agent' END;
BEGIN
  IF p_kind NOT IN ('demande_qr', 'relance_annonceur', 'envoi_dossier') THEN
    RAISE EXCEPTION 'Tâche inconnue' USING ERRCODE = '22023';
  END IF;
  SELECT client_id INTO v_client FROM public.offres WHERE id = p_offre_id;
  IF v_client IS NULL OR NOT public.steeve_staff_can_handle(v_client) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_id FROM public.steeve_actions
   WHERE kind = p_kind AND offre_id = p_offre_id AND statut = 'a_faire' LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_id, 'deja_demandee', true);
  END IF;
  INSERT INTO public.steeve_actions (kind, source, requested_by, client_id, offre_id, statut, note)
  VALUES (p_kind, v_source, auth.uid(), v_client, p_offre_id, 'a_faire', left(nullif(trim(p_note), ''), 500))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'deja_demandee', false);
END;
$$;
REVOKE ALL ON FUNCTION public.staff_request_steeve_task(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_request_steeve_task(text, uuid, text) TO authenticated;

-- Annulation d'une action pas encore exécutée (admin ou agent du client)
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
  IF v_row.statut NOT IN ('a_faire', 'a_valider', 'bloque', 'a_blanc') THEN
    RAISE EXCEPTION 'Action déjà exécutée' USING ERRCODE = '22023';
  END IF;
  UPDATE public.steeve_actions SET statut = 'annule', cancelled_by = auth.uid(), updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'statut', 'annule');
END;
$$;
REVOKE ALL ON FUNCTION public.staff_cancel_steeve_action(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_cancel_steeve_action(uuid) TO authenticated;

-- 5) Demande de postulation faite par Steeve pour le client, dans la conversation : mêmes règles que le bouton
--    de l'application (request_postulation), exécutée avec l'identité du client. Réservé au serveur.
CREATE OR REPLACE FUNCTION public.steeve_request_postulation(p_client_id uuid, p_offre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM public.clients WHERE id = p_client_id;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Dossier client introuvable' USING ERRCODE = 'P0002';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  RETURN to_jsonb(public.request_postulation(p_offre_id));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_request_postulation(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 6) Passage de Steeve opérateur toutes les 15 minutes (le serveur décide des heures d'envoi)
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'steeve-operator';
    PERFORM cron.schedule('steeve-operator', '7,22,37,52 * * * *',
      $cmd$SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/steeve-operator', headers := private.edge_service_headers(), body := '{"source":"cron"}'::jsonb, timeout_milliseconds := 120000);$cmd$);
  END IF;
END;
$do$;

-- 7) Sélections pour Steeve opérateur (réservées au serveur)

-- Client servi : actif ou en attente, compteur de crédits non arrêté (règle des routines).
CREATE OR REPLACE FUNCTION public.steeve_client_servi(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
     WHERE c.id = p_client_id AND c.statut IN ('actif', 'en_attente')
       AND NOT EXISTS (SELECT 1 FROM public.user_credits uc
                        WHERE uc.user_id = c.user_id AND uc.mandat_statut IN ('aucun', 'expire', 'suspendu')));
$$;
REVOKE ALL ON FUNCTION public.steeve_client_servi(uuid) FROM PUBLIC, anon, authenticated;

-- Dossier déjà parti pour ce bien et ce client (candidature déposée, dossier envoyé par une routine ou par Steeve).
CREATE OR REPLACE FUNCTION public.steeve_dossier_deja_envoye(p_offre_id uuid, p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.candidatures ca WHERE ca.offre_id = p_offre_id AND ca.client_id = p_client_id AND ca.date_depot IS NOT NULL)
      OR EXISTS (SELECT 1 FROM public.postulations_preparees pp WHERE pp.offre_id = p_offre_id AND pp.client_id = p_client_id AND pp.statut = 'envoye')
      OR EXISTS (SELECT 1 FROM public.steeve_actions sa WHERE sa.offre_id = p_offre_id AND sa.client_id = p_client_id AND sa.kind = 'envoi_dossier' AND sa.statut = 'fait');
$$;
REVOKE ALL ON FUNCTION public.steeve_dossier_deja_envoye(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Adresses e-mail connues pour la régie / l'annonceur d'une offre (contacts, fiche, compte rendu de visite).
CREATE OR REPLACE FUNCTION public.steeve_emails_regie(p_offre_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT lower(e)) FILTER (WHERE e IS NOT NULL), '{}')
    FROM (
      SELECT ca.annonceur_email AS e FROM public.contacts_annonceurs ca WHERE ca.offre_id = p_offre_id
      UNION ALL
      SELECT (regexp_matches(coalesce(o.contact_gerance, '') || ' ' || coalesce(o.contact_annonceur, '') || ' ' || coalesce(o.contact_visite, ''),
                             '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', 'g'))[1]
        FROM public.offres o WHERE o.id = p_offre_id
      UNION ALL
      SELECT (regexp_matches(coalesce(v.compte_rendu ->> 'contact_regie', '') || ' ' || coalesce(v.compte_rendu ->> 'autres_infos', ''),
                             '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', 'g'))[1]
        FROM public.visites v JOIN public.offres o ON o.id = v.offre_id
       WHERE v.offre_id = p_offre_id AND v.client_id = o.client_id
    ) s
   WHERE e ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
     AND lower(e) NOT LIKE '%@immo-rama.ch' AND lower(e) NOT LIKE '%@logisorama.ch';
$$;
REVOKE ALL ON FUNCTION public.steeve_emails_regie(uuid) FROM PUBLIC, anon, authenticated;

-- Demandes de QR / lien de la demande de location Flatfox : le client veut postuler, la visite a eu lieu
-- (à partir du 01.10.2026), le compte rendu ne contient ni QR ni lien, et aucun dossier n'est parti.
CREATE OR REPLACE FUNCTION public.steeve_qr_candidates(p_limit integer DEFAULT 10, p_offre_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x.date_visite), '[]'::jsonb) FROM (
    SELECT o.id AS offre_id, o.client_id, o.adresse, o.lien_annonce, o.statut, v.date_visite,
           public.steeve_person_name(c.user_id) AS client_nom,
           (SELECT ca.reference FROM public.contacts_annonceurs ca WHERE ca.offre_id = o.id AND ca.reference IS NOT NULL
             ORDER BY ca.created_at DESC LIMIT 1) AS reference,
           public.steeve_emails_regie(o.id) AS emails
      FROM public.offres o
      JOIN public.clients c ON c.id = o.client_id
      JOIN LATERAL (SELECT v.* FROM public.visites v
                     WHERE v.offre_id = o.id AND v.client_id = o.client_id AND v.date_visite < now()
                       AND v.date_visite >= '2026-10-01'::timestamptz AND coalesce(v.statut, '') <> 'annulee'
                     ORDER BY v.date_visite LIMIT 1) v ON true
     WHERE ((p_offre_id IS NULL AND o.lien_annonce ILIKE '%flatfox.ch%'
             AND o.statut IN ('souhaite_postuler', 'demande_postulation') AND o.updated_at > now() - interval '30 days')
            OR o.id = p_offre_id)
       AND public.steeve_client_servi(o.client_id)
       AND (coalesce(v.compte_rendu ->> 'autres_infos', '') || ' ' || coalesce(v.compte_rendu ->> 'contact_regie', ''))
           !~* '(\mqr\M|qr-code|qrcode|flatfox\.ch/[a-z]{2}/(apply|application|bewerbung|candidature|anmeldung))'
       AND NOT public.steeve_dossier_deja_envoye(o.id, o.client_id)
     ORDER BY v.date_visite
     LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_qr_candidates(integer, uuid) FROM PUBLIC, anon, authenticated;

-- Relance unique à 48 h des annonceurs contactés par e-mail, restée en suspens (4 h de marge laissées à la
-- routine de surveillance, qui la fait normalement au passage du matin).
CREATE OR REPLACE FUNCTION public.steeve_relance_candidates(p_limit integer DEFAULT 10, p_offre_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x.envoye_le), '[]'::jsonb) FROM (
    SELECT ca.id AS contact_id, ca.offre_id, o.client_id, coalesce(ca.adresse, o.adresse) AS adresse, ca.reference,
           lower(ca.annonceur_email) AS destinataire, ca.envoye_le, ca.portail
      FROM public.contacts_annonceurs ca
      JOIN public.offres o ON o.id = ca.offre_id
     WHERE ca.statut = 'envoye' AND ca.canal = 'email' AND ca.reponse_le IS NULL AND ca.relance_le IS NULL
       AND ca.annonceur_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
       AND ((p_offre_id IS NULL AND ca.envoye_le < now() - interval '52 hours' AND ca.envoye_le > now() - interval '14 days')
            OR (p_offre_id IS NOT NULL AND ca.offre_id = p_offre_id AND ca.envoye_le < now() - interval '24 hours'))
       AND coalesce(o.statut, '') <> 'refusee'
       AND public.steeve_client_servi(o.client_id)
     ORDER BY ca.envoye_le
     LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
  ) x;
$$;
REVOKE ALL ON FUNCTION public.steeve_relance_candidates(integer, uuid) FROM PUBLIC, anon, authenticated;

-- Offres sur lesquelles un dossier peut être envoyé, avec l'état des pièces de chaque personne :
-- sert à rapprocher un brouillon de son bien et de son client, et à contrôler les pièces.
CREATE OR REPLACE FUNCTION public.steeve_dossier_offres(p_days integer DEFAULT 45)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'offres', coalesce((SELECT jsonb_agg(x) FROM (
      SELECT o.id AS offre_id, o.client_id, o.adresse, o.statut, o.lien_annonce,
             nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), '') AS client_nom,
             public.steeve_dossier_deja_envoye(o.id, o.client_id) AS deja_envoye,
             public.steeve_emails_regie(o.id) AS emails_regie,
             (SELECT min(v.date_visite) FROM public.visites v WHERE v.offre_id = o.id AND v.client_id = o.client_id
               AND coalesce(v.statut, '') <> 'annulee') AS premiere_visite,
             (SELECT jsonb_agg(jsonb_build_object(
                'role', pr.role, 'nom', pr.nom,
                'identite', pr.identite, 'poursuites_le', pr.poursuites_le,
                'salaires_100j', pr.salaires, 'dernier_salaire_le', pr.dernier_salaire))
                FROM (
                  SELECT 'client' AS role, nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), '') AS nom,
                         bool_or(d.type_document = 'piece_identite') AS identite,
                         max(d.date_upload) FILTER (WHERE d.type_document = 'extrait_poursuites') AS poursuites_le,
                         count(*) FILTER (WHERE d.type_document = 'fiche_salaire' AND d.date_upload > now() - interval '100 days') AS salaires,
                         max(d.date_upload) FILTER (WHERE d.type_document = 'fiche_salaire') AS dernier_salaire
                    FROM public.documents d
                   WHERE (d.client_id = o.client_id OR d.user_id = c.user_id) AND d.candidate_id IS NULL
                  UNION ALL
                  SELECT cc.type, nullif(trim(coalesce(cc.prenom, '') || ' ' || coalesce(cc.nom, '')), ''),
                         bool_or(d.type_document = 'piece_identite'),
                         max(d.date_upload) FILTER (WHERE d.type_document = 'extrait_poursuites'),
                         count(*) FILTER (WHERE d.type_document = 'fiche_salaire' AND d.date_upload > now() - interval '100 days'),
                         max(d.date_upload) FILTER (WHERE d.type_document = 'fiche_salaire')
                    FROM public.client_candidates cc
                    LEFT JOIN public.documents d ON d.candidate_id = cc.id
                   WHERE cc.client_id = o.client_id
                   GROUP BY cc.id, cc.type, cc.prenom, cc.nom
                ) pr) AS personnes
        FROM public.offres o
        JOIN public.clients c ON c.id = o.client_id
        LEFT JOIN public.profiles p ON p.id = c.user_id
       WHERE o.statut IN ('souhaite_postuler', 'demande_postulation', 'visite_effectuee', 'visite_planifiee', 'interesse')
         AND o.updated_at > now() - make_interval(days => least(greatest(coalesce(p_days, 45), 1), 120))
         AND public.steeve_client_servi(o.client_id)
    ) x), '[]'::jsonb),
    'noms_clients', coalesce((SELECT jsonb_agg(DISTINCT n) FROM (
      SELECT nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), '') AS n
        FROM public.clients c JOIN public.profiles p ON p.id = c.user_id
       WHERE c.statut IN ('actif', 'en_attente')) s WHERE n IS NOT NULL AND length(n) >= 5), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.steeve_dossier_offres(integer) FROM PUBLIC, anon, authenticated;

-- Après l'envoi réel d'un dossier : mêmes mises à jour que la routine de surveillance (E2), en une transaction.
CREATE OR REPLACE FUNCTION public.steeve_record_dossier_envoye(
  p_offre_id uuid, p_client_id uuid, p_destinataire text, p_objet text, p_preuve text, p_regie text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cand uuid;
  v_adresse text;
  v_date text := to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY');
BEGIN
  SELECT adresse INTO v_adresse FROM public.offres WHERE id = p_offre_id AND client_id = p_client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offre introuvable' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.postulations_preparees (offre_id, client_id, canal, regie_nom, destinataire_email, objet, adresse_bien,
                                             source, statut, envoye_le, preuve_envoi, controle_resultat)
  VALUES (p_offre_id, p_client_id, 'email', p_regie, p_destinataire, left(p_objet, 300), v_adresse,
          'steeve', 'envoye', now(), left(p_preuve, 500), jsonb_build_object('a', true, 'b', true, 'c', true, 'par', 'steeve'));
  SELECT id INTO v_cand FROM public.candidatures WHERE offre_id = p_offre_id AND client_id = p_client_id ORDER BY created_at DESC LIMIT 1;
  IF v_cand IS NULL THEN
    INSERT INTO public.candidatures (offre_id, client_id, statut, date_depot, dossier_complet)
    VALUES (p_offre_id, p_client_id, 'en_attente', now(), true) RETURNING id INTO v_cand;
  ELSE
    UPDATE public.candidatures SET statut = CASE WHEN statut IN ('demande_postulation') THEN 'en_attente' ELSE statut END,
           date_depot = coalesce(date_depot, now()), dossier_complet = true, updated_at = now()
     WHERE id = v_cand;
  END IF;
  UPDATE public.offres
     SET statut = CASE WHEN statut IN ('acceptee') THEN statut ELSE 'candidature_deposee' END,
         commentaires = 'Dossier envoyé à la régie le ' || v_date || ', réponse en attente.',
         updated_at = now()
   WHERE id = p_offre_id;
  RETURN jsonb_build_object('candidature_id', v_cand, 'adresse', v_adresse);
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_record_dossier_envoye(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Demandes de postulation bloquées par le quota OpenAI : remises en file une seule fois (le triage passe
-- ensuite par Claude). Marque posée dans ai_result pour ne jamais boucler.
CREATE OR REPLACE FUNCTION public.steeve_requeue_postulations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.postulation_jobs
     SET status = 'queued', attempt_count = 0, next_attempt_at = now(), last_error = NULL, locked_at = NULL,
         ai_result = coalesce(ai_result, '{}'::jsonb) || jsonb_build_object('steeve_remis_en_file', now()),
         updated_at = now()
   WHERE status = 'blocked' AND last_error LIKE 'openai_%'
     AND updated_at > now() - interval '30 days'
     AND NOT (coalesce(ai_result, '{}'::jsonb) ? 'steeve_remis_en_file');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_requeue_postulations() FROM PUBLIC, anon, authenticated;

-- Tâche demandée au copilote en langage courant : offre retrouvée par le nom du client et l'adresse du bien.
CREATE OR REPLACE FUNCTION public.staff_request_steeve_task_by_address(p_kind text, p_client text, p_bien text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_client text := lower(trim(coalesce(p_client, '')));
  v_bien text := lower(trim(coalesce(p_bien, '')));
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF length(v_client) < 2 OR length(v_bien) < 3 THEN
    RAISE EXCEPTION 'Préciser le client et l''adresse du bien' USING ERRCODE = '22023';
  END IF;
  SELECT array_agg(o.id) INTO v_ids FROM (
    SELECT o.id FROM public.offres o
      JOIN public.clients c ON c.id = o.client_id
      JOIN public.profiles p ON p.id = c.user_id
     WHERE lower(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')) LIKE '%' || v_client || '%'
       AND lower(coalesce(o.adresse, '')) LIKE '%' || v_bien || '%'
       AND public.steeve_staff_can_handle(o.client_id)
     ORDER BY o.updated_at DESC LIMIT 3) o;
  IF v_ids IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Aucune offre ne correspond à ce client et à cette adresse.');
  END IF;
  IF array_length(v_ids, 1) > 1 THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'Plusieurs offres correspondent : préciser le client ou l''adresse.');
  END IF;
  RETURN jsonb_build_object('ok', true) || public.staff_request_steeve_task(p_kind, v_ids[1], p_note);
END;
$$;
REVOKE ALL ON FUNCTION public.staff_request_steeve_task_by_address(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_request_steeve_task_by_address(text, text, text, text) TO authenticated;
