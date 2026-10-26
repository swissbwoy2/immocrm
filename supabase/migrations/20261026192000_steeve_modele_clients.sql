-- Steeve clients (location et achat) sur Sonnet (décision de l'admin du 26.10.2026 : ils utilisent tous les
-- outils — recherche, postulation, visites, relances, lecture de leurs propres e-mails). Les visiteurs anonymes
-- du site gardent un modèle propre, léger par défaut (steeve_public_model), pour ne pas épuiser leur plafond.
INSERT INTO public.app_config (key, value) VALUES ('steeve_public_model', 'claude-haiku-5-5') ON CONFLICT (key) DO NOTHING;
UPDATE public.app_config SET value = 'claude-sonnet-5-5' WHERE key = 'steeve_model';

CREATE OR REPLACE FUNCTION public.steeve_public_admit(p_session_hash text, p_ip_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  -- Un message en cours compte pour son coût maximal estimé (recherche comprise, consignes en cache).
  v_pending_cost constant numeric := 0.004;
  v_cfg jsonb;
  v_id uuid;
BEGIN
  IF coalesce(p_session_hash, '') = '' OR coalesce(p_ip_hash, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalide');
  END IF;
  SELECT jsonb_object_agg(key, value) INTO v_cfg FROM public.app_config WHERE key LIKE 'steeve_public_%' OR key = 'steeve_model';
  IF coalesce(v_cfg ->> 'steeve_public_enabled', 'false') <> 'true' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'desactive');
  END IF;
  -- Une seule admission à la fois (les limites sont vérifiées sans course).
  PERFORM pg_advisory_xact_lock(hashtext('steeve_public_admit'));
  IF (SELECT coalesce(sum(CASE WHEN status = 'pending' THEN greatest(cost_usd, v_pending_cost) ELSE cost_usd END), 0)
        FROM public.steeve_public_usage WHERE created_at >= v_day_start)
       >= coalesce(nullif(v_cfg ->> 'steeve_public_day_usd', '')::numeric, 0.5)
     OR (SELECT coalesce(sum(CASE WHEN status = 'pending' THEN greatest(cost_usd, v_pending_cost) ELSE cost_usd END), 0)
        FROM public.steeve_public_usage WHERE created_at >= v_month_start)
       >= coalesce(nullif(v_cfg ->> 'steeve_public_month_usd', '')::numeric, 5) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plafond');
  END IF;
  IF (SELECT count(*) FROM public.steeve_public_usage WHERE created_at > now() - interval '1 minute')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_minute_messages', '')::int, 30)
     OR (SELECT count(*) FROM public.steeve_public_usage WHERE session_hash = p_session_hash AND created_at >= v_day_start AND status <> 'refused')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_session_messages', '')::int, 20)
     OR (SELECT count(*) FROM public.steeve_public_usage WHERE ip_hash = p_ip_hash AND created_at >= v_day_start AND status <> 'refused')
       >= coalesce(nullif(v_cfg ->> 'steeve_public_ip_messages', '')::int, 60) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'limite');
  END IF;
  INSERT INTO public.steeve_public_usage (session_hash, ip_hash) VALUES (p_session_hash, p_ip_hash) RETURNING id INTO v_id;
  -- Visiteurs anonymes : modèle propre (steeve_public_model, léger par défaut), indépendant du modèle des clients.
  RETURN jsonb_build_object('ok', true, 'usage_id', v_id,
    'model', coalesce(nullif(v_cfg ->> 'steeve_public_model', ''), 'claude-haiku-5-5'));
END;
$function$;
