-- Steeve, copilote de l'admin : lecture seule. Additive et idempotente.
-- Le modèle n'accède jamais librement à la base : il appelle ces fonctions, réservées aux admins (vérifié par
-- has_role sur l'utilisateur connecté), qui renvoient des synthèses bornées. Aucune coordonnée (e-mail,
-- téléphone, IBAN) n'en sort ; aucune ne modifie de données.

INSERT INTO public.app_config (key, value, updated_at) VALUES
  ('steeve_admin_day_usd', '2', now())   -- plafond quotidien du copilote admin (USD)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.steeve_admin_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  model text,
  input_tokens integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  tools_used text[] NOT NULL DEFAULT '{}',
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT steeve_admin_usage_status_check CHECK (status IN ('pending', 'done', 'failed'))
);
CREATE INDEX IF NOT EXISTS steeve_admin_usage_created_idx ON public.steeve_admin_usage (created_at DESC);
ALTER TABLE public.steeve_admin_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent l'usage du copilote" ON public.steeve_admin_usage;
CREATE POLICY "Admins lisent l'usage du copilote" ON public.steeve_admin_usage
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admission (clé de service) : admin, plafond du jour, un message en cours compté 0,01 USD.
CREATE OR REPLACE FUNCTION public.steeve_admin_admit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  v_id uuid;
BEGIN
  IF p_user_id IS NULL OR NOT public.has_role(p_user_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'refuse');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('steeve_admin_admit'));
  IF (SELECT coalesce(sum(CASE WHEN status = 'pending' THEN greatest(cost_usd, 0.01) ELSE cost_usd END), 0)
        FROM public.steeve_admin_usage WHERE created_at >= v_day_start)
     >= coalesce((SELECT nullif(value, '')::numeric FROM public.app_config WHERE key = 'steeve_admin_day_usd'), 2) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plafond');
  END IF;
  INSERT INTO public.steeve_admin_usage (user_id) VALUES (p_user_id) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'usage_id', v_id,
    'model', coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_model'), 'claude-haiku-5-5'));
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_admin_admit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_admin_admit(uuid) TO service_role;

-- Nom affichable d'un utilisateur (prénom nom), jamais ses coordonnées.
CREATE OR REPLACE FUNCTION public.steeve_person_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), '') FROM public.profiles p WHERE p.id = p_user_id;
$$;
REVOKE ALL ON FUNCTION public.steeve_person_name(uuid) FROM PUBLIC, anon, authenticated;

-- Conversations client dont le dernier message visible vient du client (question en attente).
CREATE OR REPLACE FUNCTION public.steeve_pending_client_questions(p_min_hours integer DEFAULT 24)
RETURNS TABLE (conversation_id uuid, client_id uuid, client_user uuid, agent_user uuid, depuis timestamptz, extrait text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, cl.id, cl.user_id, a.user_id, last_msg.created_at,
         left(public.steeve_redact(regexp_replace(coalesce(last_msg.content, '(pièce jointe)'), '[[:space:]]+', ' ', 'g')), 140)
    FROM public.conversations c
    JOIN public.clients cl ON cl.id::text = c.client_id
    LEFT JOIN public.agents a ON a.id = cl.agent_id
    CROSS JOIN LATERAL (
      SELECT m.sender_type, m.created_at, m.content FROM public.messages m
       WHERE m.conversation_id = c.id AND NOT coalesce(m.masque_messagerie, false)
       ORDER BY m.created_at DESC LIMIT 1
    ) last_msg
   WHERE c.conversation_type = 'client-agent'
     AND NOT coalesce(c.is_archived, false)
     AND coalesce(cl.statut, '') NOT IN ('stoppe', 'reloge')
     AND cl.anonymise_at IS NULL
     AND last_msg.sender_type = 'client'
     AND last_msg.created_at < now() - make_interval(hours => greatest(coalesce(p_min_hours, 24), 1));
$$;
REVOKE ALL ON FUNCTION public.steeve_pending_client_questions(integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_copilot_kpi()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'au', to_char(now() AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
    'clients_par_statut', (SELECT coalesce(jsonb_object_agg(s, n), '{}'::jsonb) FROM (
        SELECT coalesce(statut, 'inconnu') s, count(*) n FROM public.clients WHERE anonymise_at IS NULL GROUP BY 1) x),
    'demandes_de_mandat', jsonb_build_object(
      'en_attente_de_paiement_60_jours', (SELECT count(*) FROM public.demandes_mandat WHERE statut IN ('en_attente', 'facture_envoyee') AND created_at > now() - interval '60 days'),
      'montant_en_attente_chf', (SELECT coalesce(sum(montant_acompte), 0) FROM public.demandes_mandat WHERE statut IN ('en_attente', 'facture_envoyee') AND created_at > now() - interval '60 days'),
      'payees_a_activer', (SELECT count(*) FROM public.demandes_mandat WHERE statut = 'paye'),
      'nouvelles_7_jours', (SELECT count(*) FROM public.demandes_mandat WHERE created_at > now() - interval '7 days'),
      'activees_30_jours', (SELECT count(*) FROM public.demandes_mandat WHERE statut = 'active' AND coalesce(processed_at, updated_at) > now() - interval '30 days')),
    'projets_achat_par_statut', (SELECT coalesce(jsonb_object_agg(s, n), '{}'::jsonb) FROM (
        SELECT coalesce(statut, 'inconnu') s, count(*) n FROM public.purchase_projects GROUP BY 1) y),
    'activite_7_jours', jsonb_build_object(
      'offres_envoyees', (SELECT count(*) FROM public.offres WHERE date_envoi > now() - interval '7 days'),
      'visites_effectuees', (SELECT count(*) FROM public.visites WHERE statut = 'effectuee' AND date_visite BETWEEN now() - interval '7 days' AND now()),
      'candidatures_creees', (SELECT count(*) FROM public.candidatures WHERE created_at > now() - interval '7 days')),
    'visites_a_venir_7_jours', (SELECT count(*) FROM public.visites WHERE statut IN ('planifiee', 'confirmee', 'deleguee') AND date_visite BETWEEN now() AND now() + interval '7 days'),
    'succes_30_jours', (SELECT count(*) FROM public.candidatures WHERE statut IN ('bail_conclu', 'signature_effectuee', 'cles_remises') AND updated_at > now() - interval '30 days'),
    'remboursements_demandes', (SELECT count(*) FROM public.clients WHERE refund_status = 'pending'),
    'questions_clients_sans_reponse_24h', (SELECT count(*) FROM public.steeve_pending_client_questions(24)),
    'steeve', jsonb_build_object(
      'depense_clients', public.steeve_spend(NULL),
      'depense_site_public_mois_usd', (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_public_usage WHERE created_at >= v_month_start),
      'depense_copilote_mois_usd', (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_admin_usage WHERE created_at >= v_month_start))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_copilot_activations(p_limit integer DEFAULT 15)
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
  RETURN jsonb_build_object(
      'total', (SELECT count(*) FROM public.demandes_mandat WHERE statut = 'paye'
                  OR (statut IN ('en_attente', 'facture_envoyee') AND created_at > now() - interval '60 days')),
      'demandes', coalesce((SELECT jsonb_agg(row_to_json(d)::jsonb ORDER BY d.ordre, d.cree) FROM (
        SELECT CASE WHEN dm.statut = 'paye' THEN 0 ELSE 1 END AS ordre,
               dm.created_at AS cree,
               nullif(trim(coalesce(dm.prenom, '') || ' ' || coalesce(dm.nom, '')), '') AS client,
               CASE dm.statut WHEN 'paye' THEN 'payée, à activer' WHEN 'facture_envoyee' THEN 'facture envoyée' ELSE 'en attente de paiement' END AS etat,
               dm.montant_acompte AS acompte_chf,
               dm.type_recherche, dm.region_recherche, dm.pieces_recherche, dm.budget_max,
               to_char(dm.created_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS demande_le,
               (now()::date - dm.created_at::date) AS jours,
               to_char(dm.date_paiement AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS paye_le,
               dm.payment_method AS moyen_paiement,
               dm.user_id IS NOT NULL AS compte_cree
          FROM public.demandes_mandat dm
         WHERE dm.statut = 'paye'
            OR (dm.statut IN ('en_attente', 'facture_envoyee') AND dm.created_at > now() - interval '60 days')
         ORDER BY CASE WHEN dm.statut = 'paye' THEN 0 ELSE 1 END, dm.created_at
         LIMIT least(greatest(coalesce(p_limit, 15), 1), 30)) d), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_copilot_blocages(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := least(greatest(coalesce(p_days, 7), 1), 60);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'clients_actifs_sans_offre', coalesce((SELECT jsonb_agg(row_to_json(x)::jsonb) FROM (
      SELECT public.steeve_person_name(cl.user_id) AS client,
             public.steeve_person_name(a.user_id) AS agent,
             CASE WHEN o.derniere IS NULL THEN 'aucune offre'
                  ELSE (now()::date - o.derniere::date) || ' jours' END AS derniere_offre,
             to_char(cl.mandat_date_signature AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS mandat_signe_le,
             cl.region_recherche, cl.pieces, cl.budget_max
        FROM public.clients cl
        LEFT JOIN public.agents a ON a.id = cl.agent_id
        LEFT JOIN LATERAL (SELECT max(date_envoi) AS derniere FROM public.offres WHERE client_id = cl.id) o ON true
       WHERE cl.statut = 'actif' AND cl.anonymise_at IS NULL
         AND (o.derniere IS NULL OR o.derniere < now() - make_interval(days => v_days))
       ORDER BY o.derniere NULLS FIRST
       LIMIT 12) x), '[]'::jsonb),
    'questions_clients_sans_reponse', coalesce((SELECT jsonb_agg(row_to_json(q)::jsonb) FROM (
      SELECT public.steeve_person_name(p.client_user) AS client,
             public.steeve_person_name(p.agent_user) AS agent,
             round(extract(epoch FROM now() - p.depuis) / 3600) AS depuis_heures,
             p.extrait
        FROM public.steeve_pending_client_questions(24) p
       ORDER BY p.depuis
       LIMIT 12) q), '[]'::jsonb),
    'remboursements_demandes', coalesce((SELECT jsonb_agg(row_to_json(r)::jsonb) FROM (
      SELECT public.steeve_person_name(cl.user_id) AS client,
             to_char(cl.refund_requested_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS demande_le
        FROM public.clients cl WHERE cl.refund_status = 'pending'
       ORDER BY cl.refund_requested_at NULLS LAST LIMIT 12) r), '[]'::jsonb),
    'mandats_qui_finissent_sous_10_jours', coalesce((SELECT jsonb_agg(row_to_json(f)::jsonb) FROM (
      SELECT public.steeve_person_name(cl.user_id) AS client,
             public.steeve_person_name(a.user_id) AS agent,
             to_char(cl.mandate_official_end_date, 'DD.MM.YYYY') AS fin
        FROM public.clients cl LEFT JOIN public.agents a ON a.id = cl.agent_id
       WHERE cl.statut = 'actif' AND cl.mandate_official_end_date BETWEEN current_date AND current_date + 10
       ORDER BY cl.mandate_official_end_date LIMIT 12) f), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_copilot_agents()
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
  RETURN coalesce((SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.clients_actifs DESC) FROM (
    SELECT public.steeve_person_name(a.user_id) AS agent,
           (SELECT count(*) FROM public.clients cl WHERE cl.agent_id = a.id AND cl.statut = 'actif') AS clients_actifs,
           (SELECT count(*) FROM public.offres o WHERE o.agent_id = a.id AND o.date_envoi > now() - interval '7 days') AS offres_envoyees_7_jours,
           (SELECT count(*) FROM public.visites v WHERE v.agent_id = a.id AND v.statut IN ('planifiee', 'confirmee', 'deleguee')
               AND v.date_visite BETWEEN now() AND now() + interval '7 days') AS visites_a_venir_7_jours,
           (SELECT count(*) FROM public.steeve_pending_client_questions(24) p WHERE p.agent_user = a.user_id) AS questions_sans_reponse_24h
      FROM public.agents a
     WHERE coalesce(a.statut, 'actif') <> 'inactif') x), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_copilot_client(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := lower(trim(coalesce(p_query, '')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF length(v_q) < 2 THEN
    RETURN jsonb_build_object('clients', '[]'::jsonb, 'note', 'Indiquer au moins deux lettres du nom.');
  END IF;
  RETURN jsonb_build_object('clients', coalesce((SELECT jsonb_agg(row_to_json(x)::jsonb) FROM (
    SELECT public.steeve_person_name(cl.user_id) AS client,
           cl.statut, coalesce(cl.journey_type, cl.type_recherche) AS parcours,
           public.steeve_person_name(a.user_id) AS agent,
           to_char(cl.mandat_date_signature AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS mandat_signe_le,
           to_char(cl.mandate_official_end_date, 'DD.MM.YYYY') AS fin_mandat,
           cl.region_recherche, cl.type_bien, cl.pieces, cl.budget_max,
           (SELECT count(*) FROM public.offres o WHERE o.client_id = cl.id AND o.date_envoi IS NOT NULL) AS offres_total,
           (SELECT count(*) FROM public.offres o WHERE o.client_id = cl.id AND o.date_envoi > now() - interval '7 days') AS offres_7_jours,
           (SELECT count(*) FROM public.visites v WHERE v.client_id = cl.id AND v.statut IN ('planifiee', 'confirmee', 'deleguee') AND v.date_visite > now()) AS visites_a_venir,
           (SELECT count(*) FROM public.candidatures c WHERE c.client_id = cl.id AND c.statut NOT IN ('refusee')) AS candidatures_en_cours,
           (SELECT count(*) FROM public.documents d WHERE d.client_id = cl.id AND d.statut IN ('validé', 'valide')) AS documents_valides,
           (SELECT count(*) FROM public.documents d WHERE d.client_id = cl.id AND coalesce(d.statut, 'en attente') = 'en attente') AS documents_en_attente,
           (SELECT to_char(max(m.created_at) AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') FROM public.conversations cv
               JOIN public.messages m ON m.conversation_id = cv.id
              WHERE cv.client_id = cl.id::text AND m.sender_type = 'client' AND NOT coalesce(m.masque_messagerie, false)) AS dernier_message_client,
           EXISTS (SELECT 1 FROM public.steeve_pending_client_questions(24) p WHERE p.client_id = cl.id) AS question_sans_reponse_24h,
           cl.refund_status AS remboursement
      FROM public.clients cl
      LEFT JOIN public.profiles pr ON pr.id = cl.user_id
      LEFT JOIN public.agents a ON a.id = cl.agent_id
     WHERE cl.anonymise_at IS NULL
       AND lower(coalesce(pr.prenom, '') || ' ' || coalesce(pr.nom, '') || ' ' || coalesce(pr.nom, '') || ' ' || coalesce(pr.prenom, '')) LIKE '%' || v_q || '%'
     ORDER BY CASE cl.statut WHEN 'actif' THEN 0 WHEN 'suspendu' THEN 1 WHEN 'en_attente' THEN 2 ELSE 3 END, cl.created_at DESC
     LIMIT 5) x), '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_copilot_kpi(), public.admin_copilot_activations(integer), public.admin_copilot_blocages(integer),
  public.admin_copilot_agents(), public.admin_copilot_client(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_kpi(), public.admin_copilot_activations(integer), public.admin_copilot_blocages(integer),
  public.admin_copilot_agents(), public.admin_copilot_client(text) TO authenticated;

-- Pilotage : dépense du copilote et plafond.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-steeve-admin-usage') THEN
    PERFORM cron.schedule('purge-steeve-admin-usage', '31 3 * * *',
      $cmd$DELETE FROM public.steeve_admin_usage WHERE created_at < now() - interval '400 days';$cmd$);
  END IF;
END;
$$;
