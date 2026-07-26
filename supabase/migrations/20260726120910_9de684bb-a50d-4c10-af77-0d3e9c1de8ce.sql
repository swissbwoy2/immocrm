
-- Nouvelle logique needs_agent_action : seulement les cas réellement actionnables

CREATE OR REPLACE FUNCTION public.compute_offre_missing_info(_offre_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o record;
  parts text[] := ARRAY[]::text[];
  has_future_visit boolean;
  is_interest boolean;
BEGIN
  SELECT id, prix, adresse, envoi_auto, statut
    INTO o
    FROM public.offres
    WHERE id = _offre_id;
  IF NOT FOUND OR o.envoi_auto IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  IF o.prix IS NULL OR o.prix = 0 THEN
    parts := array_append(parts, 'prix à confirmer');
  END IF;
  IF o.adresse IS NULL OR btrim(o.adresse) = '' THEN
    parts := array_append(parts, 'adresse manquante');
  END IF;

  is_interest := COALESCE(o.statut, '') IN ('interesse', 'candidature');
  IF is_interest THEN
    SELECT EXISTS (
      SELECT 1 FROM public.visites v
      WHERE v.offre_id = o.id
        AND v.date_visite IS NOT NULL
        AND v.date_visite > now()
        AND COALESCE(v.statut, '') NOT IN ('annulee', 'a_fixer')
    ) INTO has_future_visit;
    IF NOT has_future_visit THEN
      parts := array_append(parts, 'client intéressé — fixer la visite');
    END IF;
  END IF;

  IF array_length(parts, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN array_to_string(parts, ' ; ');
END;
$function$;

CREATE OR REPLACE FUNCTION public.offres_compute_action_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  missing text;
  has_future_visit boolean;
  is_interest boolean;
  preserved_missing text;
BEGIN
  IF NEW.envoi_auto IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Préserver un missing_info explicitement renseigné par la routine
  -- (ex. « annonce Facebook — coordonnées à récupérer ») qui ne correspond
  -- à aucune règle automatique ci-dessous.
  preserved_missing := NULL;
  IF TG_OP = 'UPDATE' AND NEW.missing_info IS NOT NULL
     AND NEW.missing_info IS DISTINCT FROM OLD.missing_info THEN
    preserved_missing := NEW.missing_info;
  ELSIF TG_OP = 'INSERT' AND NEW.missing_info IS NOT NULL THEN
    preserved_missing := NEW.missing_info;
  END IF;

  missing := NULL;
  IF NEW.prix IS NULL OR NEW.prix = 0 THEN
    missing := 'prix à confirmer';
  END IF;
  IF NEW.adresse IS NULL OR btrim(NEW.adresse) = '' THEN
    missing := CASE WHEN missing IS NULL THEN 'adresse manquante'
                    ELSE missing || ' ; adresse manquante' END;
  END IF;

  is_interest := COALESCE(NEW.statut, '') IN ('interesse', 'candidature');
  IF is_interest THEN
    SELECT EXISTS (
      SELECT 1 FROM public.visites v
      WHERE v.offre_id = NEW.id
        AND v.date_visite IS NOT NULL
        AND v.date_visite > now()
        AND COALESCE(v.statut, '') NOT IN ('annulee', 'a_fixer')
    ) INTO has_future_visit;
    IF NOT has_future_visit THEN
      missing := CASE WHEN missing IS NULL THEN 'client intéressé — fixer la visite'
                      ELSE missing || ' ; client intéressé — fixer la visite' END;
    END IF;
  END IF;

  -- Fusion avec missing_info explicite préservé
  IF preserved_missing IS NOT NULL THEN
    missing := CASE WHEN missing IS NULL THEN preserved_missing
                    ELSE missing || ' ; ' || preserved_missing END;
  END IF;

  NEW.missing_info := missing;
  NEW.needs_agent_action := (missing IS NOT NULL);
  RETURN NEW;
END;
$function$;

-- Backfill silencieux : désactiver le trigger de notification le temps du recalcul
ALTER TABLE public.offres DISABLE TRIGGER trg_offres_notify_action_required;

UPDATE public.offres
SET missing_info = public.compute_offre_missing_info(id),
    needs_agent_action = (public.compute_offre_missing_info(id) IS NOT NULL),
    action_notified_at = CASE
      WHEN public.compute_offre_missing_info(id) IS NULL THEN NULL
      ELSE action_notified_at
    END
WHERE envoi_auto = true;

ALTER TABLE public.offres ENABLE TRIGGER trg_offres_notify_action_required;
