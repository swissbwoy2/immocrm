-- Steeve, lot 6 : assistant des propriétaires, des annonceurs et des apporteurs d'affaires.
-- Chaque fonction lit uniquement les données de la personne connectée (auth.uid()) : aucun paramètre ne permet
-- de viser quelqu'un d'autre. Lecture seule ; « contacter l'équipe » envoie une notification interne.
-- Additive et idempotente.

CREATE TABLE IF NOT EXISTS public.steeve_partner_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  model text,
  input_tokens integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  tools_used text[] NOT NULL DEFAULT '{}',
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  error text
);
CREATE INDEX IF NOT EXISTS steeve_partner_usage_day_idx ON public.steeve_partner_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS steeve_partner_usage_user_idx ON public.steeve_partner_usage (user_id, created_at DESC);
ALTER TABLE public.steeve_partner_usage ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_config (key, value, updated_at) VALUES ('steeve_partner_day_usd', '3', now())
ON CONFLICT (key) DO NOTHING;

-- Rôle « partenaire » de la personne : propriétaire, annonceur ou apporteur (dans cet ordre).
CREATE OR REPLACE FUNCTION public.steeve_partner_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.proprietaires WHERE user_id = p_user_id) THEN 'proprietaire'
    WHEN EXISTS (SELECT 1 FROM public.annonceurs WHERE user_id = p_user_id) THEN 'annonceur'
    WHEN EXISTS (SELECT 1 FROM public.apporteurs WHERE user_id = p_user_id) THEN 'apporteur'
  END;
$$;
REVOKE ALL ON FUNCTION public.steeve_partner_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_partner_role(uuid) TO authenticated;

-- Admission d'un message : Steeve activé, plafond quotidien global, 60 messages par personne et par jour.
-- p_role : espace d'où Steeve est ouvert ; accepté seulement si la personne a bien ce rôle.
CREATE OR REPLACE FUNCTION public.steeve_partner_admit(p_user_id uuid, p_role text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  v_role text := CASE
    WHEN p_role = 'proprietaire' AND EXISTS (SELECT 1 FROM public.proprietaires WHERE user_id = p_user_id) THEN 'proprietaire'
    WHEN p_role = 'annonceur' AND EXISTS (SELECT 1 FROM public.annonceurs WHERE user_id = p_user_id) THEN 'annonceur'
    WHEN p_role = 'apporteur' AND EXISTS (SELECT 1 FROM public.apporteurs WHERE user_id = p_user_id) THEN 'apporteur'
    ELSE public.steeve_partner_role(p_user_id) END;
  v_id uuid;
BEGIN
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'refuse');
  END IF;
  IF coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_enabled'), 'false') <> 'true' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'desactive');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('steeve_partner_admit'));
  IF (SELECT coalesce(sum(CASE WHEN status = 'pending' THEN greatest(cost_usd, 0.01) ELSE cost_usd END), 0)
        FROM public.steeve_partner_usage WHERE created_at >= v_day_start)
     >= coalesce((SELECT nullif(value, '')::numeric FROM public.app_config WHERE key = 'steeve_partner_day_usd'), 3) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plafond');
  END IF;
  IF (SELECT count(*) FROM public.steeve_partner_usage WHERE user_id = p_user_id AND created_at >= v_day_start) >= 60 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'quota');
  END IF;
  INSERT INTO public.steeve_partner_usage (user_id, role) VALUES (p_user_id, v_role) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'usage_id', v_id, 'role', v_role,
    'model', coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_model'), 'claude-haiku-5-5'),
    'prenom', (SELECT prenom FROM public.profiles WHERE id = p_user_id));
END;
$$;
DROP FUNCTION IF EXISTS public.steeve_partner_admit(uuid);
REVOKE ALL ON FUNCTION public.steeve_partner_admit(uuid, text) FROM PUBLIC, anon, authenticated;

-- Propriétaire : immeubles, lots, baux, tickets, échéances (hypothèques, assurances), écritures en retard.
CREATE OR REPLACE FUNCTION public.steeve_proprio_apercu()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
  v_statut text;
BEGIN
  SELECT id, statut INTO v_pid, v_statut FROM public.proprietaires WHERE user_id = auth.uid() LIMIT 1;
  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'compte', v_statut,
    'immeubles', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'nom', i.nom, 'adresse', concat_ws(', ', i.adresse, concat_ws(' ', i.code_postal, i.ville)), 'type', i.type_bien,
        'statut', i.statut, 'mode', i.mode_exploitation, 'vente', i.statut_vente, 'prix_vente_demande', i.prix_vente_demande,
        'etat_locatif_annuel', i.etat_locatif_annuel, 'taux_vacance', i.taux_vacance,
        'lots', (SELECT count(*) FROM public.lots l WHERE l.immeuble_id = i.id),
        'lots_vacants', (SELECT count(*) FROM public.lots l WHERE l.immeuble_id = i.id AND l.statut IN ('vacant', 'libre', 'disponible')))
        ORDER BY i.nom), '[]'::jsonb) FROM public.immeubles i WHERE i.proprietaire_id = v_pid),
    'baux', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'immeuble', i.nom, 'lot', l.designation, 'locataire', nullif(trim(concat_ws(' ', li.prenom, left(li.nom, 1) || '.')), '.'),
        'statut', b.statut, 'debut', b.date_debut, 'fin', b.date_fin, 'loyer_mensuel_total', b.total_mensuel,
        'derniere_indexation', b.date_derniere_indexation, 'preavis_mois', b.preavis_mois)
        ORDER BY b.date_fin NULLS LAST), '[]'::jsonb)
        FROM public.baux b JOIN public.lots l ON l.id = b.lot_id JOIN public.immeubles i ON i.id = l.immeuble_id
        LEFT JOIN public.locataires_immeuble li ON li.id = b.locataire_id
       WHERE i.proprietaire_id = v_pid),
    'tickets_ouverts', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'numero', t.numero_ticket, 'titre', t.titre, 'statut', t.statut, 'priorite', t.priorite, 'immeuble', i.nom,
        'cree_le', t.created_at, 'intervention_prevue', t.date_intervention_prevue) ORDER BY t.created_at DESC), '[]'::jsonb)
        FROM public.tickets_techniques t JOIN public.immeubles i ON i.id = t.immeuble_id
       WHERE i.proprietaire_id = v_pid AND coalesce(t.statut, '') NOT IN ('resolu', 'ferme', 'clos', 'termine', 'annule')),
    'hypotheques', (SELECT coalesce(jsonb_agg(jsonb_build_object('immeuble', i.nom, 'creancier', h.creancier, 'taux', h.taux_interet,
        'type_taux', h.type_taux, 'montant_actuel', h.montant_actuel, 'fin', h.date_fin, 'prochaine_echeance', h.date_prochaine_echeance)), '[]'::jsonb)
        FROM public.hypotheques h JOIN public.immeubles i ON i.id = h.immeuble_id WHERE i.proprietaire_id = v_pid),
    'assurances', (SELECT coalesce(jsonb_agg(jsonb_build_object('immeuble', i.nom, 'assureur', a.assureur, 'type', a.type_assurance,
        'prime_annuelle', a.prime_annuelle, 'prochaine_echeance', a.date_prochaine_echeance, 'fin', a.date_fin)), '[]'::jsonb)
        FROM public.assurances_immeuble a JOIN public.immeubles i ON i.id = a.immeuble_id WHERE i.proprietaire_id = v_pid),
    'ecritures_en_retard', (SELECT jsonb_build_object('nombre', count(*), 'montant', coalesce(sum(coalesce(t.debit, 0) + coalesce(t.credit, 0)), 0))
        FROM public.transactions_comptables t JOIN public.immeubles i ON i.id = t.immeuble_id
       WHERE i.proprietaire_id = v_pid AND t.date_echeance < current_date AND t.date_paiement IS NULL
         AND coalesce(t.statut, '') NOT IN ('paye', 'payee', 'regle', 'annule'))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_proprio_apercu() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_proprio_apercu() TO authenticated;

-- Annonceur : compte, annonces (statut, refus, expiration, statistiques), visites à venir, candidatures, messages non lus.
CREATE OR REPLACE FUNCTION public.steeve_annonceur_apercu()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a record;
BEGIN
  SELECT id, type_annonceur, statut, type_abonnement, credits_annonces, date_expiration_abonnement, est_verifie
    INTO v_a FROM public.annonceurs WHERE user_id = auth.uid() LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'compte', jsonb_build_object('type', v_a.type_annonceur, 'statut', v_a.statut, 'verifie', v_a.est_verifie,
      'abonnement', v_a.type_abonnement, 'credits', v_a.credits_annonces, 'abonnement_expire_le', v_a.date_expiration_abonnement),
    'annonces', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'titre', a.titre, 'reference', a.reference, 'ville', a.ville, 'transaction', a.type_transaction, 'prix', a.prix,
        'statut', a.statut, 'motif_refus', a.motif_refus, 'publiee_le', a.date_publication, 'expire_le', a.date_expiration,
        'vues', a.nb_vues, 'vues_uniques', a.nb_vues_uniques, 'favoris', a.nb_favoris, 'contacts', a.nb_contacts,
        'mise_en_avant', a.est_mise_en_avant,
        'creneaux_a_venir', (SELECT coalesce(jsonb_agg(jsonb_build_object('le', cr.date_heure, 'places', cr.capacite_max,
             'inscrits', (SELECT count(*) FROM public.candidatures_location cl WHERE cl.creneau_id = cr.id AND NOT coalesce(cl.annulee, false) AND coalesce(cl.statut, '') <> 'desiste'))
             ORDER BY cr.date_heure), '[]'::jsonb)
             FROM public.annonce_creneaux cr WHERE cr.annonce_id = a.id AND cr.actif AND cr.date_heure > now()),
        'candidatures', (SELECT coalesce(jsonb_object_agg(s.statut, s.n), '{}'::jsonb) FROM (
             SELECT coalesce(cl.statut, 'inconnu') AS statut, count(*) n FROM public.candidatures_location cl
              WHERE cl.annonce_id = a.id GROUP BY 1) s))
        ORDER BY a.updated_at DESC), '[]'::jsonb)
        FROM public.annonces_publiques a WHERE a.annonceur_id = v_a.id),
    'messages_non_lus', (SELECT count(*) FROM public.messages_annonces m
        JOIN public.conversations_annonces c ON c.id = m.conversation_id
       WHERE (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
         AND m.expediteur_id IS DISTINCT FROM auth.uid() AND NOT coalesce(m.lu, false) AND NOT coalesce(m.supprime, false))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_annonceur_apercu() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_annonceur_apercu() TO authenticated;

-- Apporteur : contrat, taux, recommandations (client abrégé) et commissions.
CREATE OR REPLACE FUNCTION public.steeve_apporteur_apercu()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a record;
BEGIN
  SELECT id, statut, contrat_signe, date_signature, date_expiration, taux_commission, minimum_vente, minimum_location,
         code_parrainage, total_commissions_gagnees
    INTO v_a FROM public.apporteurs WHERE user_id = auth.uid() LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'compte', jsonb_build_object('statut', v_a.statut, 'contrat_signe', v_a.contrat_signe, 'signe_le', v_a.date_signature,
      'expire_le', v_a.date_expiration, 'taux_commission', v_a.taux_commission, 'minimum_vente', v_a.minimum_vente,
      'minimum_location', v_a.minimum_location, 'code_parrainage', v_a.code_parrainage, 'total_commissions', v_a.total_commissions_gagnees),
    'recommandations', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'client', nullif(trim(concat_ws(' ', r.client_prenom, left(r.client_nom, 1) || '.')), '.'), 'type', r.type_affaire,
        'lieu', r.lieu_situation, 'statut', r.statut, 'commission', r.montant_commission, 'conclu_le', r.date_conclusion,
        'valide_le', r.date_validation, 'paye_le', r.date_paiement, 'soumis_le', r.created_at) ORDER BY r.created_at DESC), '[]'::jsonb)
        FROM public.referrals r WHERE r.apporteur_id = v_a.id),
    'totaux', (SELECT coalesce(jsonb_object_agg(s.statut, jsonb_build_object('nombre', s.n, 'commissions', s.total)), '{}'::jsonb) FROM (
        SELECT coalesce(r.statut, 'inconnu') AS statut, count(*) n, coalesce(sum(r.montant_commission), 0) total
          FROM public.referrals r WHERE r.apporteur_id = v_a.id GROUP BY 1) s)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_apporteur_apercu() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_apporteur_apercu() TO authenticated;

-- « Contacter l'équipe » : notification aux admins (et à l'agent du propriétaire), 5 par jour au plus.
CREATE OR REPLACE FUNCTION public.steeve_partner_contact(p_sujet text, p_message text, p_role text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := CASE
    WHEN p_role = 'proprietaire' AND EXISTS (SELECT 1 FROM public.proprietaires WHERE user_id = auth.uid()) THEN 'proprietaire'
    WHEN p_role = 'annonceur' AND EXISTS (SELECT 1 FROM public.annonceurs WHERE user_id = auth.uid()) THEN 'annonceur'
    WHEN p_role = 'apporteur' AND EXISTS (SELECT 1 FROM public.apporteurs WHERE user_id = auth.uid()) THEN 'apporteur'
    ELSE public.steeve_partner_role(auth.uid()) END;
  v_link text;
  v_agent uuid;
  v_nom text;
  v_dest uuid;
  v_envoi uuid := gen_random_uuid();
  v_day timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
BEGIN
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(DISTINCT metadata ->> 'envoi') FROM public.notifications
       WHERE type = 'steeve_partenaire' AND metadata ->> 'de' = v_uid::text AND created_at >= v_day) >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'motif', 'limite');
  END IF;
  v_nom := coalesce((SELECT nullif(trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')), '') FROM public.profiles WHERE id = v_uid), 'Un partenaire');
  IF v_role = 'proprietaire' THEN
    SELECT '/admin/proprietaires/' || p.id, a.user_id INTO v_link, v_agent FROM public.proprietaires p LEFT JOIN public.agents a ON a.id = p.agent_id WHERE p.user_id = v_uid LIMIT 1;
  ELSIF v_role = 'annonceur' THEN
    SELECT '/admin/annonceurs/' || id INTO v_link FROM public.annonceurs WHERE user_id = v_uid LIMIT 1;
  ELSE
    SELECT '/admin/apporteurs/' || id INTO v_link FROM public.apporteurs WHERE user_id = v_uid LIMIT 1;
  END IF;
  FOR v_dest IN SELECT user_id FROM public.user_roles WHERE role = 'admin' UNION SELECT v_agent WHERE v_agent IS NOT NULL LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, read, metadata)
    VALUES (v_dest, 'steeve_partenaire', left('Steeve : ' || coalesce(nullif(trim(p_sujet), ''), 'demande'), 120),
            left(v_nom || ' (' || v_role || ') : ' || coalesce(p_message, ''), 600),
            CASE WHEN v_dest = v_agent THEN replace(v_link, '/admin/', '/agent/') ELSE v_link END, false,
            jsonb_build_object('de', v_uid, 'role', v_role, 'envoi', v_envoi));
  END LOOP;
  RETURN jsonb_build_object('ok', true);
END;
$$;
DROP FUNCTION IF EXISTS public.steeve_partner_contact(text, text);
REVOKE ALL ON FUNCTION public.steeve_partner_contact(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steeve_partner_contact(text, text, text) TO authenticated;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-steeve-partner-usage';
    PERFORM cron.schedule('purge-steeve-partner-usage', '33 3 * * *', $cmd$DELETE FROM public.steeve_partner_usage WHERE created_at < now() - interval '400 days';$cmd$);
  END IF;
END;
$do$;
