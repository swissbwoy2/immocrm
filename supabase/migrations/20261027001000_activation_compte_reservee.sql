-- Activation d'un compte (profiles.actif) : réservée aux administrateurs, aux fonctions serveur
-- et au démarrage d'essai candidat (start_candidat_trial). Un utilisateur ne peut plus s'activer lui-même
-- en modifiant son profil (ce qui lui donnait 90 jours de mandat via credits_on_trial_activation).
-- Même principe que protect_profile_trial_started_at. Aucune donnée existante modifiée.
-- Appliquée en base le 26.10.2026 (testée : client refusé, admin accepté).
CREATE OR REPLACE FUNCTION public.protect_profile_actif()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.actif IS DISTINCT FROM OLD.actif
     AND auth.uid() IS NOT NULL
     AND coalesce(auth.role(), '') <> 'service_role'
     AND coalesce(current_setting('app.trial_rpc', true), '') <> 'on'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.actif := OLD.actif;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_actif ON public.profiles;
CREATE TRIGGER trg_protect_profile_actif
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_actif();
