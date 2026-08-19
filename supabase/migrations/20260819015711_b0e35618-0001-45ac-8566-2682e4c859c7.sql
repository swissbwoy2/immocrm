ALTER TABLE public.annonces_publiques
  ADD COLUMN IF NOT EXISTS mise_en_avant_rang integer,
  ADD COLUMN IF NOT EXISTS mise_en_avant_depuis timestamp with time zone;

UPDATE public.annonces_publiques
   SET mise_en_avant_depuis = COALESCE(mise_en_avant_depuis, date_mise_en_avant_debut, date_publication, created_at)
 WHERE est_mise_en_avant IS TRUE;

CREATE INDEX IF NOT EXISTS idx_annonces_mise_en_avant
  ON public.annonces_publiques (est_mise_en_avant DESC, mise_en_avant_rang ASC NULLS LAST, mise_en_avant_depuis DESC);

CREATE OR REPLACE FUNCTION public.protect_annonce_promotion_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
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

DROP TRIGGER IF EXISTS trg_protect_annonce_promotion_fields ON public.annonces_publiques;
CREATE TRIGGER trg_protect_annonce_promotion_fields
BEFORE INSERT OR UPDATE ON public.annonces_publiques
FOR EACH ROW EXECUTE FUNCTION public.protect_annonce_promotion_fields();