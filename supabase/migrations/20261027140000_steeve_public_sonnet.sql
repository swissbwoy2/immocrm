-- Steeve public (site et portail d'annonces) : Sonnet 5.5 pour mieux présenter et convertir (demande de l'admin du
-- 26.10.2026). Un message en cours compte pour son coût estimé selon le modèle ; plafonds relevés en conséquence.
INSERT INTO public.app_config (key, value) VALUES
  ('steeve_public_model', 'claude-sonnet-5-5'),
  ('steeve_public_day_usd', '3'),
  ('steeve_public_month_usd', '30')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.steeve_public_admit(p_session_hash text, p_ip_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich';
  v_cfg jsonb;
  v_model text;
  -- Un message en cours compte pour son coût maximal estimé (recherche comprise, consignes en cache), selon le modèle.
  v_pending_cost numeric;
  v_id uuid;
BEGIN
  IF coalesce(p_session_hash, '') = '' OR coalesce(p_ip_hash, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalide');
  END IF;
  SELECT jsonb_object_agg(key, value) INTO v_cfg FROM public.app_config WHERE key LIKE 'steeve_public_%' OR key = 'steeve_model';
  IF coalesce(v_cfg ->> 'steeve_public_enabled', 'false') <> 'true' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'desactive');
  END IF;
  -- Visiteurs anonymes : modèle propre (steeve_public_model), indépendant du modèle des clients.
  v_model := coalesce(nullif(v_cfg ->> 'steeve_public_model', ''), 'claude-haiku-5-5');
  v_pending_cost := CASE WHEN v_model ILIKE '%opus%' THEN 0.08 WHEN v_model ILIKE '%sonnet%' THEN 0.03 ELSE 0.004 END;
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
  RETURN jsonb_build_object('ok', true, 'usage_id', v_id, 'model', v_model);
END;
$function$;
