CREATE OR REPLACE FUNCTION public.candidat_pieces_num(p text) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT nullif(substring(coalesce(p,'') from '([0-9]+(\.[0-9]+)?)'), '')::numeric
$$;

CREATE OR REPLACE FUNCTION public.candidat_pieces_line(p text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE n numeric := public.candidat_pieces_num(p);
BEGIN
  IF n IS NULL OR position('+' in coalesce(p,'')) = 0 THEN RETURN NULL; END IF;
  RETURN format('Pièces : %s et plus — acceptés : %s, %s, %s, %s, %s (dans la limite du budget).',
    trim_scale(n), trim_scale(n), trim_scale(n+0.5), trim_scale(n+1), trim_scale(n+1.5), trim_scale(n+2));
END $$;

-- Remplace uniquement la ligne générée « Pièces : » en conservant le reste
CREATE OR REPLACE FUNCTION public.candidat_merge_souhaits(existing text, line text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE rest text;
BEGIN
  SELECT string_agg(l, E'\n') INTO rest
    FROM regexp_split_to_table(coalesce(existing,''), E'\n') l
   WHERE l NOT LIKE 'Pièces : %';
  rest := nullif(rtrim(coalesce(rest,''), E'\n'), '');
  IF line IS NULL THEN RETURN rest; END IF;
  RETURN CASE WHEN rest IS NULL THEN line ELSE rest || E'\n' || line END;
END $$;

CREATE OR REPLACE FUNCTION public.sync_candidat_criteres_to_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.clients c SET
    region_recherche = coalesce(nullif(trim(NEW.region_recherche),''), c.region_recherche),
    budget_max       = coalesce(NEW.budget_max, c.budget_max),
    revenus_mensuels = coalesce(NEW.revenus_mensuels, c.revenus_mensuels),
    type_bien        = coalesce(nullif(trim(NEW.type_bien),''), c.type_bien),
    type_recherche   = coalesce(nullif(trim(NEW.type_recherche),''), c.type_recherche),
    pieces           = coalesce(public.candidat_pieces_num(NEW.pieces_recherche), c.pieces),
    souhaits_particuliers = public.candidat_merge_souhaits(c.souhaits_particuliers, public.candidat_pieces_line(NEW.pieces_recherche))
  WHERE c.user_id = NEW.user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_candidat_criteres_to_client ON public.candidat_criteres;
CREATE TRIGGER trg_sync_candidat_criteres_to_client
AFTER INSERT OR UPDATE ON public.candidat_criteres
FOR EACH ROW EXECUTE FUNCTION public.sync_candidat_criteres_to_client();

CREATE OR REPLACE FUNCTION public.start_candidat_trial()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_ts timestamptz; r record; v_line text; v_souhaits text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'candidat') THEN
    RAISE EXCEPTION 'Réservé aux candidats';
  END IF;
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
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, 'client') ON CONFLICT (user_id, role) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE user_id = v_uid) THEN
    INSERT INTO public.clients(user_id) VALUES (v_uid);
  END IF;
  -- Recopie des critères candidat (champs vides uniquement)
  v_line := public.candidat_pieces_line(r.pieces_recherche);
  v_souhaits := nullif(trim(coalesce(r.souhaits_particuliers,'')), '');
  v_souhaits := CASE WHEN v_line IS NULL THEN v_souhaits
                     WHEN v_souhaits IS NULL THEN v_line
                     ELSE v_souhaits || E'\n' || v_line END;
  UPDATE public.clients c SET
    region_recherche = coalesce(nullif(trim(c.region_recherche),''), nullif(trim(r.region_recherche),'')),
    budget_max       = coalesce(nullif(c.budget_max,0), r.budget_max),
    revenus_mensuels = coalesce(nullif(c.revenus_mensuels,0), r.revenus_mensuels),
    type_bien        = coalesce(nullif(trim(c.type_bien),''), nullif(trim(r.type_bien),'')),
    type_recherche   = coalesce(nullif(trim(c.type_recherche),''), nullif(trim(r.type_recherche),'')),
    pieces           = coalesce(nullif(c.pieces,0), public.candidat_pieces_num(r.pieces_recherche)),
    souhaits_particuliers = coalesce(nullif(trim(c.souhaits_particuliers),''), v_souhaits)
  WHERE c.user_id = v_uid;
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