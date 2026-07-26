
-- 1. Colonnes
ALTER TABLE public.offres
  ADD COLUMN IF NOT EXISTS needs_agent_action boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS missing_info text,
  ADD COLUMN IF NOT EXISTS action_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS interesse_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_offres_needs_agent_action
  ON public.offres (needs_agent_action) WHERE needs_agent_action = true;

-- 2. Helper : calcule le champ missing_info pour une offre (retourne NULL si complète)
CREATE OR REPLACE FUNCTION public.compute_offre_missing_info(_offre_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  parts text[] := ARRAY[]::text[];
  has_future_visit boolean;
BEGIN
  SELECT id, prix, adresse, envoi_auto
    INTO o
    FROM public.offres
    WHERE id = _offre_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.visites v
    WHERE v.offre_id = o.id
      AND v.date_visite IS NOT NULL
      AND v.date_visite > now()
      AND COALESCE(v.statut, '') NOT IN ('annulee', 'a_fixer')
  ) INTO has_future_visit;

  IF NOT has_future_visit THEN
    parts := array_append(parts, 'date de visite à fixer');
  END IF;
  IF o.prix IS NULL OR o.prix = 0 THEN
    parts := array_append(parts, 'prix à confirmer');
  END IF;
  IF o.adresse IS NULL OR btrim(o.adresse) = '' THEN
    parts := array_append(parts, 'adresse à compléter');
  END IF;

  IF array_length(parts, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN array_to_string(parts, ' ; ');
END;
$$;

-- 3. Envoi des notifications (agent + admins)
CREATE OR REPLACE FUNCTION public.notify_offre_action_required(
  _offre_id uuid,
  _title text,
  _type text,
  _link_prefix text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  client_name text;
  agent_user uuid;
  admin_row record;
  msg text;
BEGIN
  SELECT o.id, o.adresse, o.prix, o.client_id, o.agent_id, o.missing_info, o.lien_annonce,
         COALESCE(p.prenom || ' ' || p.nom, p.email, 'Client') AS client_name,
         a.user_id AS agent_user_id
    INTO o
    FROM public.offres o
    LEFT JOIN public.clients c ON c.id = o.client_id
    LEFT JOIN public.profiles p ON p.id = c.user_id
    LEFT JOIN public.agents a ON a.id = o.agent_id
    WHERE o.id = _offre_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  msg := o.client_name || ' — ' || COALESCE(o.adresse, 'annonce sans adresse')
       || CASE WHEN o.missing_info IS NOT NULL AND _type = 'auto_offre_incomplete'
               THEN E'\nÀ compléter : ' || o.missing_info
               ELSE '' END;

  IF o.agent_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      o.agent_user_id, _type, _title, msg,
      _link_prefix || o.id::text,
      jsonb_build_object('offre_id', o.id, 'client_id', o.client_id, 'missing_info', o.missing_info)
    );
  END IF;

  FOR admin_row IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    -- ne pas dupliquer si l'agent est aussi admin
    IF o.agent_user_id IS NULL OR admin_row.user_id <> o.agent_user_id THEN
      PERFORM public.create_notification(
        admin_row.user_id, _type, _title, msg,
        '/admin/offres-auto',
        jsonb_build_object('offre_id', o.id, 'client_id', o.client_id, 'missing_info', o.missing_info)
      );
    END IF;
  END LOOP;
END;
$$;

-- 4. Trigger BEFORE sur offres : calcule missing_info + needs_agent_action
CREATE OR REPLACE FUNCTION public.offres_compute_action_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  missing text;
  has_future_visit boolean;
BEGIN
  IF NEW.envoi_auto IS NOT TRUE THEN
    -- ne concerne que les offres auto
    RETURN NEW;
  END IF;

  -- Calcul inline (on n'appelle pas la fn helper pour éviter un SELECT sur la ligne en cours)
  SELECT EXISTS (
    SELECT 1 FROM public.visites v
    WHERE v.offre_id = NEW.id
      AND v.date_visite IS NOT NULL
      AND v.date_visite > now()
      AND COALESCE(v.statut, '') NOT IN ('annulee', 'a_fixer')
  ) INTO has_future_visit;

  missing := NULL;
  IF NOT has_future_visit THEN
    missing := 'date de visite à fixer';
  END IF;
  IF NEW.prix IS NULL OR NEW.prix = 0 THEN
    missing := CASE WHEN missing IS NULL THEN 'prix à confirmer'
                    ELSE missing || ' ; prix à confirmer' END;
  END IF;
  IF NEW.adresse IS NULL OR btrim(NEW.adresse) = '' THEN
    missing := CASE WHEN missing IS NULL THEN 'adresse à compléter'
                    ELSE missing || ' ; adresse à compléter' END;
  END IF;

  NEW.missing_info := missing;
  NEW.needs_agent_action := (missing IS NOT NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offres_compute_action_state ON public.offres;
CREATE TRIGGER trg_offres_compute_action_state
  BEFORE INSERT OR UPDATE OF prix, adresse, envoi_auto, statut ON public.offres
  FOR EACH ROW EXECUTE FUNCTION public.offres_compute_action_state();

-- 5. Trigger AFTER sur offres : envoie les notifications (dédupe via action_notified_at / interesse_notified_at)
CREATE OR REPLACE FUNCTION public.offres_notify_action_required()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_future_visit boolean;
BEGIN
  IF NEW.envoi_auto IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- 1) offre incomplète, jamais notifiée
  IF NEW.needs_agent_action = true AND NEW.action_notified_at IS NULL THEN
    PERFORM public.notify_offre_action_required(
      NEW.id,
      '⚠️ Offre auto à compléter — action requise',
      'auto_offre_incomplete',
      '/admin/offres-auto?offre='
    );
    UPDATE public.offres SET action_notified_at = now()
      WHERE id = NEW.id AND action_notified_at IS NULL;
  END IF;

  -- 2) client intéressé / candidature sans visite future
  IF NEW.statut IN ('interesse', 'candidature')
     AND NEW.interesse_notified_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM NEW.statut) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.visites v
      WHERE v.offre_id = NEW.id
        AND v.date_visite > now()
        AND COALESCE(v.statut, '') NOT IN ('annulee', 'a_fixer')
    ) INTO has_future_visit;

    IF NOT has_future_visit THEN
      PERFORM public.notify_offre_action_required(
        NEW.id,
        '✅ Client intéressé — fixer la visite',
        'auto_offre_interesse_no_visit',
        '/admin/offres-auto?offre='
      );
      UPDATE public.offres SET interesse_notified_at = now()
        WHERE id = NEW.id AND interesse_notified_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offres_notify_action_required ON public.offres;
CREATE TRIGGER trg_offres_notify_action_required
  AFTER INSERT OR UPDATE OF needs_agent_action, statut, action_notified_at ON public.offres
  FOR EACH ROW EXECUTE FUNCTION public.offres_notify_action_required();

-- 6. Trigger sur visites : recalcule l'état des offres liées quand une visite change
CREATE OR REPLACE FUNCTION public.visites_recompute_offre_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_offre uuid;
  missing text;
BEGIN
  target_offre := COALESCE(NEW.offre_id, OLD.offre_id);
  IF target_offre IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  missing := public.compute_offre_missing_info(target_offre);

  UPDATE public.offres
    SET missing_info = missing,
        needs_agent_action = (missing IS NOT NULL)
    WHERE id = target_offre
      AND envoi_auto = true
      AND (missing_info IS DISTINCT FROM missing
           OR needs_agent_action IS DISTINCT FROM (missing IS NOT NULL));

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_visites_recompute_offre_action ON public.visites;
CREATE TRIGGER trg_visites_recompute_offre_action
  AFTER INSERT OR UPDATE OF date_visite, statut, offre_id OR DELETE ON public.visites
  FOR EACH ROW EXECUTE FUNCTION public.visites_recompute_offre_action();

-- 7. Backfill : marquer les offres auto existantes incomplètes (sans notifier — action_notified_at = now())
UPDATE public.offres o
  SET missing_info = m.missing,
      needs_agent_action = (m.missing IS NOT NULL),
      action_notified_at = COALESCE(o.action_notified_at,
        CASE WHEN m.missing IS NOT NULL THEN now() ELSE NULL END)
  FROM (
    SELECT id, public.compute_offre_missing_info(id) AS missing
    FROM public.offres WHERE envoi_auto = true
  ) m
  WHERE o.id = m.id;
