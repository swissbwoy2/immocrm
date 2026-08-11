
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS visite_id uuid REFERENCES public.visites(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_visite_id_uidx ON public.calendar_events(visite_id) WHERE visite_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_visite_to_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_title text;
  v_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_events WHERE visite_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.date_visite IS NULL THEN
    DELETE FROM public.calendar_events WHERE visite_id = NEW.id;
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    auth.uid(),
    (SELECT a.user_id FROM public.agents a WHERE a.id = NEW.agent_id),
    (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1)
  ) INTO v_creator;

  IF v_creator IS NULL THEN
    RETURN NEW;
  END IF;

  v_title := 'Visite — ' || COALESCE(NEW.adresse, 'Adresse à confirmer');
  v_status := CASE WHEN NEW.statut IN ('effectuee', 'annulee') THEN 'effectue' ELSE 'planifie' END;

  INSERT INTO public.calendar_events (
    visite_id, created_by, agent_id, client_id, event_type, title,
    description, event_date, end_date, status, all_day
  ) VALUES (
    NEW.id, v_creator, NEW.agent_id, NEW.client_id, 'visite', v_title,
    NEW.notes, NEW.date_visite, NEW.date_visite_fin, v_status, false
  )
  ON CONFLICT (visite_id) WHERE visite_id IS NOT NULL DO UPDATE SET
    agent_id = EXCLUDED.agent_id,
    client_id = EXCLUDED.client_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    event_date = EXCLUDED.event_date,
    end_date = EXCLUDED.end_date,
    status = EXCLUDED.status,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_visite_calendar_event ON public.visites;
CREATE TRIGGER trg_sync_visite_calendar_event
AFTER INSERT OR UPDATE OF date_visite, date_visite_fin, adresse, statut, agent_id, client_id, notes OR DELETE
ON public.visites
FOR EACH ROW EXECUTE FUNCTION public.sync_visite_to_calendar_event();

-- Backfill: visites des 6 derniers mois et à venir
INSERT INTO public.calendar_events (visite_id, created_by, agent_id, client_id, event_type, title, description, event_date, end_date, status, all_day)
SELECT v.id,
       COALESCE((SELECT a.user_id FROM public.agents a WHERE a.id = v.agent_id),
                (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1)),
       v.agent_id, v.client_id, 'visite',
       'Visite — ' || COALESCE(v.adresse, 'Adresse à confirmer'),
       v.notes, v.date_visite, v.date_visite_fin,
       CASE WHEN v.statut IN ('effectuee','annulee') THEN 'effectue' ELSE 'planifie' END,
       false
FROM public.visites v
WHERE v.date_visite IS NOT NULL
  AND v.date_visite >= now() - interval '6 months'
  AND COALESCE((SELECT a.user_id FROM public.agents a WHERE a.id = v.agent_id),
               (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1)) IS NOT NULL
ON CONFLICT (visite_id) WHERE visite_id IS NOT NULL DO NOTHING;
