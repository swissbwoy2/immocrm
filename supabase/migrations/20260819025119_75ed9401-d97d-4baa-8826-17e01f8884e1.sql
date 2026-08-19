CREATE OR REPLACE FUNCTION public.sync_annonceur_contact_to_annonces()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nom IS DISTINCT FROM OLD.nom
     OR NEW.prenom IS DISTINCT FROM OLD.prenom
     OR NEW.nom_entreprise IS DISTINCT FROM OLD.nom_entreprise
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.telephone IS DISTINCT FROM OLD.telephone THEN
    UPDATE public.annonces_publiques
    SET nom_contact = COALESCE(NULLIF(NEW.nom_entreprise, ''), NULLIF(TRIM(CONCAT_WS(' ', NEW.prenom, NEW.nom)), ''), nom_contact),
        email_contact = COALESCE(NULLIF(NEW.email, ''), email_contact),
        telephone_contact = COALESCE(NULLIF(NEW.telephone, ''), telephone_contact),
        updated_at = now()
    WHERE annonceur_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_annonceur_contact ON public.annonceurs;
CREATE TRIGGER trg_sync_annonceur_contact
AFTER UPDATE ON public.annonceurs
FOR EACH ROW EXECUTE FUNCTION public.sync_annonceur_contact_to_annonces();