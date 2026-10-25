-- Steeve, lot 2c (suite) : écran de pilotage admin.
-- Additive et idempotente. Tout passe par des fonctions réservées aux admins (vérifié côté serveur).

-- 1) Authentification des e-mails : le résultat (favorable ou non) est gardé à la relève, la confiance dans le
--    serveur de réception se décide à la lecture. Un admin peut donc déclarer le serveur après coup.
ALTER TABLE public.mailbox_emails ADD COLUMN IF NOT EXISTS auth_pass boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.steeve_client_emails(p_client_id uuid, p_limit integer DEFAULT 8, p_days integer DEFAULT 120)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_verified text;
  v_email text;
  v_staff text[];
  v_boxes text[];
  v_limit integer := least(greatest(coalesce(p_limit, 8), 1), 15);
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 120), 1), 365));
  v_internal_rx constant text := '@([a-z0-9-]+\.)*(immo-rama|logisorama)\.ch$';
  v_finance_rx constant text := '@([a-z0-9-]+\.)*(stripe\.com|twint\.ch|postfinance\.ch|ubs\.com|credit-suisse\.com|raiffeisen\.ch|bcv\.ch|intrum\.(com|ch)|lowell\.(com|ch)|creditreform\.ch|bexio\.com|banana\.ch|vd\.ch|ge\.ch|admin\.ch)$';
  v_sensitive_rx constant text := '(factur|paiement|paye|payer|virement|versement|acompte|honorair|commission|rembours|impaye|arriere|rappel|mise en demeure|poursuite|commandement de payer|recouvrement|encaiss|contentieux|tribunal|conciliation|avocat|huissier|litige|plainte|expulsion|resiliation|dette|iban|salaire|comptab)';
  v_result jsonb;
BEGIN
  SELECT c.user_id, c.steeve_email_verifie INTO v_user, v_verified FROM public.clients c WHERE c.id = p_client_id;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'emails', '[]'::jsonb, 'adresse_verifiee', false);
  END IF;
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_user;

  -- Adresse de confiance : vérifiée par l'agence et inchangée depuis. Jamais une adresse de l'agence,
  -- d'une boîte partagée ou du personnel.
  SELECT array_agg(lower(address)) INTO v_boxes FROM public.shared_mailboxes;
  SELECT array_agg(DISTINCT lower(u.email)) INTO v_staff
    FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id
   WHERE r.role::text IN ('admin', 'agent', 'coursier', 'closeur', 'automation_operator') AND u.email IS NOT NULL;
  -- Chaque condition est ramenée à vrai/faux : une valeur NULL ne doit jamais ouvrir l'accès.
  IF v_email IS NULL
     OR NOT coalesce(v_verified = v_email, false)
     OR coalesce(v_email ~ v_internal_rx, true)
     OR coalesce(v_email = ANY (coalesce(v_boxes, '{}')), true)
     OR coalesce(v_email = ANY (coalesce(v_staff, '{}')), true) THEN
    RETURN jsonb_build_object('total', 0, 'emails', '[]'::jsonb, 'adresse_verifiee', false);
  END IF;

  WITH kept AS (
    SELECT DISTINCT ON (coalesce(m.message_key, m.id::text), coalesce(m.from_email, '')) m.*,
           (m.from_email = v_email) AS from_client,
           (coalesce(m.from_email, '') ~ v_internal_rx OR m.from_email = ANY (coalesce(v_staff, '{}'))) AS internal_sender
      FROM public.mailbox_emails m
      JOIN public.shared_mailboxes b ON b.id = m.mailbox_id AND b.is_active
     WHERE m.received_at >= v_since AND m.received_at <= now() + interval '1 day'
       AND m.addrs @> ARRAY[v_email]
       -- Authentifié : résultat favorable d'un serveur que l'admin a déclaré de confiance pour cette boîte.
       AND (m.auth_verified
            OR (m.auth_pass AND m.auth_server IS NOT NULL
                AND m.auth_server = ANY (string_to_array(replace(lower(b.trusted_authserv), ' ', ''), ','))))
     ORDER BY coalesce(m.message_key, m.id::text), coalesce(m.from_email, ''), m.received_at
  ), ranked AS (
    SELECT *, count(*) OVER () AS total FROM kept ORDER BY received_at DESC NULLS LAST LIMIT v_limit
  )
  SELECT jsonb_build_object(
    'adresse_verifiee', true,
    'total', coalesce(max(total), 0),
    'emails', coalesce(jsonb_agg(
      CASE WHEN from_client OR internal_sender THEN jsonb_build_object(
        'date', to_char(received_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
        'expediteur', CASE WHEN from_client THEN 'le client lui-même' ELSE 'équipe Logisorama / Immo-Rama' END,
        'objet', left(public.steeve_redact(subject), 200),
        'extrait', left(public.steeve_redact(regexp_replace(coalesce(top_text, ''), '[[:space:]]+', ' ', 'g')), 900),
        'sensible', (coalesce(norm_top, '') ~ v_sensitive_rx OR coalesce(from_email, '') ~ v_finance_rx))
      ELSE jsonb_build_object(
        -- E-mail externe où le client n'est que destinataire ou en copie : signalé sans contenu
        -- (un expéditeur peut ajouter n'importe quelle adresse en copie sans l'envoyer réellement).
        'date', to_char(received_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
        'expediteur', CASE
          WHEN coalesce(from_email, '') ~ '@([a-z0-9-]+\.)*(flatfox|homegate|immobilier|comparis|realadvisor|immoscout24|newhome|anibis|swissmarketplace|acheter-louer)\.(ch|com)$' THEN 'portail immobilier'
          ELSE 'régie, bailleur ou autre expéditeur' END,
        'client_en_copie', true)
      END
    ORDER BY received_at DESC NULLS LAST), '[]'::jsonb)
  ) INTO v_result
  FROM ranked;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.steeve_client_emails(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_emails(uuid, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_list_shared_mailboxes()
RETURNS TABLE (
  id uuid, address text, label text, imap_host text, imap_port integer, is_active boolean,
  has_password boolean, last_sync_at timestamptz, last_attempt_at timestamptz, last_error text,
  pending_count integer, emails_count bigint, verified_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT m.id, m.address, m.label, m.imap_host, m.imap_port, m.is_active, m.secret_id IS NOT NULL,
         m.last_sync_at, m.last_attempt_at, m.last_error, m.pending_count,
         (SELECT count(*) FROM public.mailbox_emails e WHERE e.mailbox_id = m.id),
         (SELECT count(*) FROM public.mailbox_emails e WHERE e.mailbox_id = m.id
            AND (e.auth_verified OR (e.auth_pass AND e.auth_server = ANY (string_to_array(replace(lower(m.trusted_authserv), ' ', ''), ',')))))
    FROM public.shared_mailboxes m
   ORDER BY m.address;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_shared_mailboxes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_shared_mailboxes() TO authenticated;

-- Serveurs d'authentification relevés dans chaque boîte (pour choisir celui de confiance).
CREATE OR REPLACE FUNCTION public.admin_mailbox_auth_servers()
RETURNS TABLE (mailbox_id uuid, address text, auth_server text, emails bigint, favorables bigint, trusted boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT b.id, b.address, e.auth_server, count(*), count(*) FILTER (WHERE e.auth_pass),
         e.auth_server = ANY (string_to_array(replace(lower(b.trusted_authserv), ' ', ''), ','))
    FROM public.mailbox_emails e
    JOIN public.shared_mailboxes b ON b.id = e.mailbox_id
   WHERE e.auth_server IS NOT NULL
   GROUP BY b.id, b.address, b.trusted_authserv, e.auth_server
   ORDER BY b.address, count(*) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_mailbox_trusted_server(p_mailbox_id uuid, p_server text, p_trusted boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server text := lower(trim(coalesce(p_server, '')));
  v_list text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF v_server !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$' THEN
    RAISE EXCEPTION 'Serveur invalide' USING ERRCODE = '22023';
  END IF;
  SELECT array_remove(string_to_array(replace(lower(trusted_authserv), ' ', ''), ','), '') INTO v_list
    FROM public.shared_mailboxes WHERE id = p_mailbox_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boîte introuvable' USING ERRCODE = 'P0002';
  END IF;
  v_list := array_remove(coalesce(v_list, '{}'), v_server);
  IF p_trusted THEN
    v_list := v_list || v_server;
  END IF;
  UPDATE public.shared_mailboxes SET trusted_authserv = array_to_string(v_list, ','), updated_at = now() WHERE id = p_mailbox_id;
  RETURN array_to_string(v_list, ',');
END;
$$;

-- 2) Réglages de Steeve (liste fermée de clés, valeurs contrôlées).
CREATE OR REPLACE FUNCTION public.admin_steeve_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'settings', (SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) FROM public.app_config
                  WHERE key IN ('steeve_enabled', 'steeve_public_enabled', 'steeve_pilot_client_ids', 'steeve_model',
                                'steeve_budget_month_usd', 'steeve_alert_month_usd', 'steeve_budget_day_usd',
                                'steeve_client_day_usd', 'steeve_client_day_messages', 'steeve_public_day_usd',
                                'steeve_public_month_usd', 'steeve_public_minute_messages',
                                'steeve_public_session_messages', 'steeve_public_ip_messages')),
    'spend', public.steeve_spend(NULL),
    'public_spend', jsonb_build_object(
      'day_usd', (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_public_usage WHERE created_at >= v_day_start),
      'month_usd', (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_public_usage
                     WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich')),
    'today', jsonb_build_object(
      'reponses', (SELECT count(*) FROM public.steeve_runs WHERE created_at >= v_day_start AND kind = 'reply' AND status = 'done'),
      'accueils', (SELECT count(*) FROM public.steeve_runs WHERE created_at >= v_day_start AND kind = 'welcome' AND status = 'done'),
      'transferts', (SELECT count(*) FROM public.steeve_runs WHERE created_at >= v_day_start AND (reason = 'transfere_agent' OR status IN ('failed', 'capped'))),
      'echecs', (SELECT count(*) FROM public.steeve_runs WHERE created_at >= v_day_start AND status = 'failed'),
      'site_public', (SELECT count(*) FROM public.steeve_public_usage WHERE created_at >= v_day_start AND status = 'done')
    ),
    'conversations', jsonb_build_object(
      'avec_steeve', (SELECT count(*) FROM public.conversations WHERE conversation_type = 'client-agent' AND handled_by = 'steeve'),
      'accueillies', (SELECT count(*) FROM public.conversations WHERE conversation_type = 'client-agent' AND coalesce(steeve_summary ->> 'welcomed_at', '') <> '')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_steeve_settings(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_value text;
  v_num numeric;
  v_limits constant jsonb := jsonb_build_object(
    'steeve_budget_month_usd', 1000, 'steeve_alert_month_usd', 1000, 'steeve_budget_day_usd', 200,
    'steeve_client_day_usd', 20, 'steeve_client_day_messages', 500, 'steeve_public_day_usd', 50,
    'steeve_public_month_usd', 200, 'steeve_public_minute_messages', 300,
    'steeve_public_session_messages', 200, 'steeve_public_ip_messages', 2000);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'Réglages invalides' USING ERRCODE = '22023';
  END IF;
  FOR r IN SELECT key, value FROM jsonb_each_text(p_settings) LOOP
    v_value := trim(coalesce(r.value, ''));
    IF r.key IN ('steeve_enabled', 'steeve_public_enabled') THEN
      IF v_value NOT IN ('true', 'false') THEN
        RAISE EXCEPTION 'Valeur invalide pour %', r.key USING ERRCODE = '22023';
      END IF;
    ELSIF r.key = 'steeve_pilot_client_ids' THEN
      v_value := replace(v_value, ' ', '');
      IF v_value NOT IN ('', 'all')
         AND v_value !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})*$' THEN
        RAISE EXCEPTION 'Liste pilote invalide' USING ERRCODE = '22023';
      END IF;
    ELSIF r.key = 'steeve_model' THEN
      IF v_value NOT IN ('claude-haiku-5-5', 'claude-sonnet-5-5') THEN
        RAISE EXCEPTION 'Modèle non autorisé' USING ERRCODE = '22023';
      END IF;
    ELSIF v_limits ? r.key THEN
      BEGIN
        v_num := v_value::numeric;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Nombre invalide pour %', r.key USING ERRCODE = '22023';
      END;
      IF v_num < 0 OR v_num > (v_limits ->> r.key)::numeric THEN
        RAISE EXCEPTION 'Valeur hors limites pour %', r.key USING ERRCODE = '22023';
      END IF;
      v_value := v_num::text;
    ELSE
      RAISE EXCEPTION 'Réglage inconnu : %', r.key USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.app_config (key, value, updated_at) VALUES (r.key, v_value, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  END LOOP;
  RETURN public.admin_steeve_overview();
END;
$$;

-- 3) Clients du pilote et recherche de clients.
CREATE OR REPLACE FUNCTION public.admin_steeve_clients(p_query text DEFAULT NULL)
RETURNS TABLE (client_id uuid, prenom text, nom text, email text, statut text, in_pilot boolean, email_verifie boolean, has_conversation boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pilot text := replace(coalesce((SELECT value FROM public.app_config WHERE key = 'steeve_pilot_client_ids'), ''), ' ', '');
  v_ids text[] := CASE WHEN v_pilot IN ('', 'all') THEN '{}'::text[] ELSE string_to_array(v_pilot, ',') END;
  v_q text := lower(trim(coalesce(p_query, '')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT c.id, p.prenom, p.nom, lower(u.email)::text, c.statut,
         (v_pilot = 'all' OR c.id::text = ANY (v_ids)),
         coalesce(c.steeve_email_verifie = lower(u.email), false),
         EXISTS (SELECT 1 FROM public.conversations v WHERE v.client_id = c.id::text AND v.conversation_type = 'client-agent')
    FROM public.clients c
    LEFT JOIN public.profiles p ON p.id = c.user_id
    LEFT JOIN auth.users u ON u.id = c.user_id
   WHERE CASE WHEN length(v_q) >= 2
              THEN lower(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '') || ' ' || coalesce(u.email, '')) LIKE '%' || v_q || '%'
              ELSE c.id::text = ANY (v_ids) END
   ORDER BY p.nom NULLS LAST, p.prenom
   LIMIT 50;
END;
$$;

-- 4) Journal des passages.
CREATE OR REPLACE FUNCTION public.admin_steeve_journal(p_limit integer DEFAULT 50)
RETURNS TABLE (
  run_id uuid, created_at timestamptz, kind text, status text, reason text, cost_usd numeric, calls integer,
  conversation_id uuid, client_id text, client_nom text, error text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.id, r.created_at, r.kind, r.status, r.reason, r.cost_usd, r.calls, r.conversation_id, r.client_id,
         nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ''), left(r.error, 300)
    FROM public.steeve_runs r
    LEFT JOIN public.clients c ON c.id::text = r.client_id
    LEFT JOIN public.profiles p ON p.id = c.user_id
   ORDER BY r.created_at DESC
   LIMIT least(greatest(coalesce(p_limit, 50), 1), 200);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mailbox_auth_servers() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_mailbox_trusted_server(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_steeve_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_steeve_settings(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_steeve_clients(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_steeve_journal(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mailbox_auth_servers(), public.admin_set_mailbox_trusted_server(uuid, text, boolean),
  public.admin_steeve_overview(), public.admin_set_steeve_settings(jsonb), public.admin_steeve_clients(text),
  public.admin_steeve_journal(integer) TO authenticated;
