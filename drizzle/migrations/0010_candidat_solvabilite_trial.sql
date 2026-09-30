ALTER TABLE public.candidat_criteres
  ADD COLUMN IF NOT EXISTS type_permis text,
  ADD COLUMN IF NOT EXISTS revenus_mensuels numeric,
  ADD COLUMN IF NOT EXISTS poursuites boolean;

CREATE OR REPLACE FUNCTION public.start_candidat_trial()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_ts timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'candidat') THEN RETURN NULL; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.candidat_criteres
     WHERE user_id = v_uid
       AND nullif(trim(type_permis), '') IS NOT NULL
       AND revenus_mensuels IS NOT NULL AND revenus_mensuels > 0
       AND poursuites IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Solvabilité requise pour démarrer l''essai';
  END IF;
  PERFORM set_config('app.trial_rpc', 'on', true);
  UPDATE public.profiles SET trial_started_at = now()
   WHERE id = v_uid AND coalesce(actif, false) = false AND trial_started_at IS NULL
   RETURNING trial_started_at INTO v_ts;
  PERFORM set_config('app.trial_rpc', 'off', true);
  RETURN v_ts;
END $function$;