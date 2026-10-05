CREATE OR REPLACE FUNCTION public.start_candidat_trial()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_ts timestamptz; r record;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'candidat') THEN
    RAISE EXCEPTION 'Réservé aux candidats';
  END IF;
  -- 1. Solvabilité (bloquant : rien n'est créé en cas d'échec)
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
  -- 2. Rôle client + dossier client
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, 'client') ON CONFLICT (user_id, role) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE user_id = v_uid) THEN
    INSERT INTO public.clients(user_id) VALUES (v_uid);
  END IF;
  -- 3. Essai (une seule fois, jamais pour un compte déjà activé)
  PERFORM set_config('app.trial_rpc', 'on', true);
  UPDATE public.profiles SET trial_started_at = now()
   WHERE id = v_uid AND coalesce(actif, false) = false AND trial_started_at IS NULL
   RETURNING trial_started_at INTO v_ts;
  PERFORM set_config('app.trial_rpc', 'off', true);
  IF v_ts IS NOT NULL THEN
    INSERT INTO public.user_credits(user_id, coins_mandat, mandat_statut, derniere_decrementation)
    VALUES (v_uid, 3, 'essai', current_date)
    ON CONFLICT (user_id) DO UPDATE SET coins_mandat = 3, mandat_statut = 'essai', derniere_decrementation = current_date;
  END IF;
  RETURN v_ts;
END $function$;

-- Point d'entrée unique : l'ancienne fonction délègue désormais à start_candidat_trial()
CREATE OR REPLACE FUNCTION public.activate_candidat_searches()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.start_candidat_trial();
END; $function$;