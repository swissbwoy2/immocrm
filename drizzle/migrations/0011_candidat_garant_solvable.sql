ALTER TABLE public.candidat_criteres ADD COLUMN IF NOT EXISTS garant_solvable boolean;

CREATE OR REPLACE FUNCTION public.is_candidat_solvable(_revenus numeric, _budget numeric, _permis text, _poursuites boolean)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT coalesce(_revenus,0) > 0
     AND coalesce(_revenus,0) >= 3 * coalesce(_budget,0)
     AND lower(trim(coalesce(_permis,''))) IN ('b','c','suisse','citoyen','citoyen suisse')
     AND _poursuites = false
$$;

CREATE OR REPLACE FUNCTION public.start_candidat_trial()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_ts timestamptz; r record;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'candidat') THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.candidat_criteres
   WHERE user_id = v_uid
     AND nullif(trim(type_permis), '') IS NOT NULL
     AND revenus_mensuels IS NOT NULL AND revenus_mensuels > 0
     AND poursuites IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solvabilité requise pour démarrer l''essai';
  END IF;
  IF NOT public.is_candidat_solvable(r.revenus_mensuels, r.budget_max, r.type_permis, r.poursuites)
     AND coalesce(r.garant_solvable, false) = false THEN
    RAISE EXCEPTION 'Dossier non solvable : contactez-nous au 021 634 31 61';
  END IF;
  PERFORM set_config('app.trial_rpc', 'on', true);
  UPDATE public.profiles SET trial_started_at = now()
   WHERE id = v_uid AND coalesce(actif, false) = false AND trial_started_at IS NULL
   RETURNING trial_started_at INTO v_ts;
  PERFORM set_config('app.trial_rpc', 'off', true);
  RETURN v_ts;
END $function$;