-- Copilote admin : modèle propre (app_config.steeve_admin_model), Sonnet par défaut, pour qu'il utilise ses outils
-- (lecture des e-mails, offres, postulations, visites) au lieu de répéter une réponse précédente. Le modèle des
-- clients (steeve_model) ne change pas ; le plafond quotidien du copilote (steeve_admin_day_usd) reste appliqué.
INSERT INTO public.app_config (key, value) VALUES ('steeve_admin_model', 'claude-sonnet-5-5')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.steeve_admin_admit(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'model', coalesce((SELECT nullif(value, '') FROM public.app_config WHERE key = 'steeve_admin_model'),
                      (SELECT value FROM public.app_config WHERE key = 'steeve_model'), 'claude-haiku-5-5'));
END;
$function$;
