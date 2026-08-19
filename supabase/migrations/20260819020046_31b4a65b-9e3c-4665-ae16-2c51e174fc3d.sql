CREATE OR REPLACE FUNCTION public.protect_annonce_promotion_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins + traitements internes (service_role / maintenance) autorisés
  IF has_role(auth.uid(), 'admin'::app_role)
     OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     OR COALESCE((current_setting('request.jwt.claims', true)::json ->> 'role'), '') = 'service_role'
     OR current_setting('request.jwt.claims', true) IS NULL
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.est_mise_en_avant := false;
    NEW.mise_en_avant_rang := NULL;
    NEW.mise_en_avant_depuis := NULL;
    NEW.date_mise_en_avant_debut := NULL;
    NEW.date_mise_en_avant_fin := NULL;
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.est_mise_en_avant, false) IS DISTINCT FROM COALESCE(OLD.est_mise_en_avant, false)
     OR NEW.mise_en_avant_rang IS DISTINCT FROM OLD.mise_en_avant_rang
     OR NEW.mise_en_avant_depuis IS DISTINCT FROM OLD.mise_en_avant_depuis
     OR NEW.date_mise_en_avant_debut IS DISTINCT FROM OLD.date_mise_en_avant_debut
     OR NEW.date_mise_en_avant_fin IS DISTINCT FROM OLD.date_mise_en_avant_fin
  THEN
    RAISE EXCEPTION 'Seul un administrateur peut modifier la mise en avant d''une annonce';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_annonce_promotion_fields() FROM PUBLIC, anon, authenticated;