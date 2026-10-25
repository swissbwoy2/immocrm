-- Pilotage de Steeve : dépense et plafond quotidien du copilote admin. Additive et idempotente.
-- Reprend admin_steeve_overview et admin_set_steeve_settings (20261025202000) avec la clé steeve_admin_day_usd.

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
                                'steeve_public_session_messages', 'steeve_public_ip_messages', 'steeve_admin_day_usd')),
    'spend', public.steeve_spend(NULL),
    'public_spend', jsonb_build_object(
      'day_usd', (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_public_usage WHERE created_at >= v_day_start),
      'month_usd', (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_public_usage
                     WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich')),
    'admin_spend', jsonb_build_object(
      'day_usd', (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_admin_usage WHERE created_at >= v_day_start),
      'month_usd', (SELECT coalesce(sum(cost_usd), 0) FROM public.steeve_admin_usage
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
    'steeve_public_session_messages', 200, 'steeve_public_ip_messages', 2000, 'steeve_admin_day_usd', 50);
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
