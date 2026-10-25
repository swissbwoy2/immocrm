-- Faille corrigée : un client (ou candidat) pouvait marquer lui-même ses documents « validé », à l'envoi
-- (politique « Users can insert their documents ») ou ensuite (« Users can update their documents »,
-- « Clients can manage their candidate documents »). Steeve et l'équipe les auraient alors crus vérifiés.
-- Désormais, seuls l'équipe (admin, agent, automate) et les traitements serveur (clé de service, fonctions
-- SECURITY DEFINER) fixent le statut, la date de validation et le commentaire de l'équipe.
-- Un document déposé par un client part toujours « en attente » ; ses autres champs restent modifiables.
-- Additive et idempotente. Les documents existants ne sont pas modifiés.

CREATE OR REPLACE FUNCTION public.guard_document_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Traitements serveur : clé de service, fonctions SECURITY DEFINER, migrations.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF v_uid IS NOT NULL AND (
       public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'agent'::app_role)
    OR public.has_role(v_uid, 'automation_operator'::app_role)) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.statut := 'en attente';
    NEW.validated_at := NULL;
    NEW.commentaire_admin := NULL;
  ELSE
    NEW.statut := OLD.statut;
    NEW.validated_at := OLD.validated_at;
    NEW.commentaire_admin := OLD.commentaire_admin;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_document_validation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_document_validation ON public.documents;
CREATE TRIGGER trg_guard_document_validation
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_validation();
