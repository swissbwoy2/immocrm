ALTER TABLE public.coursiers ADD COLUMN IF NOT EXISTS tarif_horaire numeric NOT NULL DEFAULT 20;

CREATE TABLE IF NOT EXISTS public.coursier_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coursier_id uuid NOT NULL REFERENCES public.coursiers(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coursier_time_entries TO authenticated;
GRANT ALL ON public.coursier_time_entries TO service_role;

ALTER TABLE public.coursier_time_entries ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coursier_time_entries_one_active
  ON public.coursier_time_entries (coursier_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_coursier_time_entries_coursier_started
  ON public.coursier_time_entries (coursier_id, started_at DESC);

CREATE OR REPLACE FUNCTION public.is_my_coursier(_coursier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.coursiers c
    WHERE c.id = _coursier_id AND c.user_id = auth.uid()
  );
END;
$$;

CREATE POLICY "Coursier can view own time entries"
ON public.coursier_time_entries FOR SELECT TO authenticated
USING (public.is_my_coursier(coursier_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coursier can insert own time entries"
ON public.coursier_time_entries FOR INSERT TO authenticated
WITH CHECK (public.is_my_coursier(coursier_id) AND NOT public.is_demo_user(auth.uid()));

CREATE POLICY "Coursier can update own time entries"
ON public.coursier_time_entries FOR UPDATE TO authenticated
USING (public.is_my_coursier(coursier_id) AND NOT public.is_demo_user(auth.uid()))
WITH CHECK (public.is_my_coursier(coursier_id) AND NOT public.is_demo_user(auth.uid()));

CREATE POLICY "Coursier can delete own time entries"
ON public.coursier_time_entries FOR DELETE TO authenticated
USING (public.is_my_coursier(coursier_id) AND NOT public.is_demo_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.coursier_time_entry_finalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.ended_at IS NOT NULL THEN
    NEW.duration_minutes := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60)::int);
  ELSE
    NEW.duration_minutes := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coursier_time_entry_finalize ON public.coursier_time_entries;
CREATE TRIGGER trg_coursier_time_entry_finalize
BEFORE INSERT OR UPDATE ON public.coursier_time_entries
FOR EACH ROW EXECUTE FUNCTION public.coursier_time_entry_finalize();