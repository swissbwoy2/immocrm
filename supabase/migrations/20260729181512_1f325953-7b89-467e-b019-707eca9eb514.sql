
CREATE OR REPLACE FUNCTION public.notify_offre_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_label text;
BEGIN
  IF NEW.statut IS NOT DISTINCT FROM OLD.statut THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.user_id INTO v_user_id FROM public.clients c WHERE c.id = NEW.client_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_label := CASE NEW.statut
    WHEN 'envoyee' THEN 'Nouvelle offre reçue'
    WHEN 'interesse' THEN 'Intérêt enregistré'
    WHEN 'visite_planifiee' THEN 'Visite planifiée'
    WHEN 'visite_confirmee' THEN 'Visite confirmée'
    WHEN 'visite_effectuee' THEN 'Visite effectuée'
    WHEN 'souhaite_postuler' THEN 'Vous souhaitez postuler'
    WHEN 'candidature_deposee' THEN 'Candidature déposée'
    WHEN 'acceptee' THEN 'Offre acceptée'
    WHEN 'refusee' THEN 'Offre refusée'
    ELSE 'Statut mis à jour: ' || NEW.statut
  END;

  PERFORM public.create_notification(
    p_user_id  => v_user_id,
    p_type     => 'offre_status_change',
    p_title    => v_label,
    p_message  => COALESCE(NEW.adresse, ''),
    p_link     => '/client/offres-recues',
    p_metadata => jsonb_build_object('offre_id', NEW.id, 'statut', NEW.statut)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_offre_status_change ON public.offres;
CREATE TRIGGER trg_notify_offre_status_change
AFTER UPDATE OF statut ON public.offres
FOR EACH ROW
EXECUTE FUNCTION public.notify_offre_status_change();
