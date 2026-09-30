ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_trial_started_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
     AND coalesce(current_setting('app.trial_rpc', true), '') <> 'on'
     AND coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.trial_started_at := OLD.trial_started_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile_trial_started_at ON public.profiles;
CREATE TRIGGER trg_protect_profile_trial_started_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_trial_started_at();

CREATE OR REPLACE FUNCTION public.start_candidat_trial()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ts timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'candidat') THEN RETURN NULL; END IF;
  PERFORM set_config('app.trial_rpc', 'on', true);
  UPDATE public.profiles SET trial_started_at = now()
   WHERE id = v_uid AND coalesce(actif, false) = false AND trial_started_at IS NULL
   RETURNING trial_started_at INTO v_ts;
  PERFORM set_config('app.trial_rpc', 'off', true);
  RETURN v_ts;
END $$;

REVOKE ALL ON FUNCTION public.start_candidat_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_candidat_trial() TO authenticated;