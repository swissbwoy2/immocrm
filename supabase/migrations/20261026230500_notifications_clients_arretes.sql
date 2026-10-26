-- Notifications de relance pour des clients arrêtés (stoppé, inactif, suspendu, relogé…) : plus créées.
-- Cas observé : une ancienne offre automatique (juillet) d'un client stoppé, modifiée aujourd'hui, relançait
-- « Offre auto à compléter » ; idem pour les rappels de fiches de salaire et d'extrait des poursuites.
-- Seules les relances listées ci-dessous sont concernées : messages, paiements, mandats, visites et offres
-- envoyées restent toujours notifiés. Chaque notification écartée est gardée dans un journal (lecture admin).
-- Nouvelle table + nouvelle fonction + nouveau déclencheur ; aucune donnée existante modifiée ni supprimée.

CREATE TABLE IF NOT EXISTS public.notifications_ecartees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  type text,
  title text,
  client_id uuid,
  client_statut text
);
ALTER TABLE public.notifications_ecartees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent les notifications écartées" ON public.notifications_ecartees;
CREATE POLICY "Admins lisent les notifications écartées" ON public.notifications_ecartees
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.notifications_ecartees FROM anon;

-- Relance concernant un client : le type fait partie des relances de suivi.
CREATE OR REPLACE FUNCTION public.notification_est_relance_client(p_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(p_type, '') IN (
           'auto_offre_incomplete', 'auto_offre_interesse_no_visit', 'offre_criteres_a_revoir', 'client_inactive')
      OR coalesce(p_type, '') LIKE 'client_payslip_reminder%'
      OR coalesce(p_type, '') LIKE 'payslip_reminder%'
      OR coalesce(p_type, '') LIKE '%extrait_poursuites%';
$$;

CREATE OR REPLACE FUNCTION public.notifications_ecarter_clients_arretes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_statut text;
  v_ref text;
BEGIN
  IF NOT public.notification_est_relance_client(NEW.type) THEN
    RETURN NEW;
  END IF;
  BEGIN
    v_ref := nullif(NEW.metadata ->> 'client_id', '');
    IF v_ref ~* '^[0-9a-f-]{36}$' THEN v_client := v_ref::uuid; END IF;
    IF v_client IS NULL THEN
      v_ref := nullif(NEW.metadata ->> 'offre_id', '');
      IF v_ref ~* '^[0-9a-f-]{36}$' THEN SELECT client_id INTO v_client FROM public.offres WHERE id = v_ref::uuid; END IF;
    END IF;
    IF v_client IS NULL THEN
      v_ref := nullif(NEW.metadata ->> 'visite_id', '');
      IF v_ref ~* '^[0-9a-f-]{36}$' THEN SELECT client_id INTO v_client FROM public.visites WHERE id = v_ref::uuid; END IF;
    END IF;
    IF v_client IS NULL THEN
      v_ref := substring(coalesce(NEW.link, '') FROM '/clients/([0-9a-fA-F-]{36})');
      IF v_ref IS NOT NULL THEN v_client := v_ref::uuid; END IF;
    END IF;
    IF v_client IS NULL AND NEW.user_id IS NOT NULL THEN
      -- Rappel adressé au client lui-même (fiches de salaire, extrait des poursuites).
      SELECT id INTO v_client FROM public.clients WHERE user_id = NEW.user_id ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF v_client IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT statut INTO v_statut FROM public.clients WHERE id = v_client;
    IF v_statut IS NULL OR v_statut IN ('actif', 'en_attente') THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.notifications_ecartees (user_id, type, title, client_id, client_statut)
    VALUES (NEW.user_id, NEW.type, left(NEW.title, 200), v_client, v_statut);
    RETURN NULL;
  EXCEPTION WHEN OTHERS THEN
    -- En cas de doute, la notification part normalement.
    RETURN NEW;
  END;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_ecarter_clients_arretes ON public.notifications;
CREATE TRIGGER trg_notifications_ecarter_clients_arretes
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_ecarter_clients_arretes();
