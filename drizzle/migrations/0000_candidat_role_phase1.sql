ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'candidat';

ALTER TABLE public.candidatures DROP CONSTRAINT candidatures_statut_check;
ALTER TABLE public.candidatures ADD CONSTRAINT candidatures_statut_check CHECK (statut = ANY (ARRAY['en_attente','acceptee','refusee','bail_conclu','attente_bail','bail_recu','signature_planifiee','signature_effectuee','etat_lieux_fixe','cles_remises','retenu_bailleur']));
ALTER TABLE public.candidatures_location DROP CONSTRAINT candidatures_location_statut_check;
ALTER TABLE public.candidatures_location ADD CONSTRAINT candidatures_location_statut_check CHECK (statut = ANY (ARRAY['en_attente','en_analyse','documents_demandes','visite_planifiee','visite_effectuee','accepte','refuse','desiste','retenu_bailleur']));

ALTER TABLE public.candidatures_location ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_candidatures_location_user_id ON public.candidatures_location(user_id);

CREATE OR REPLACE FUNCTION public.is_candidat(_uid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role::text = 'candidat');
END; $$;

CREATE OR REPLACE FUNCTION public.current_auth_email()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN lower((SELECT email FROM auth.users WHERE id = auth.uid()));
END; $$;

-- Demande de location générale (sans pièces)
CREATE TABLE public.demandes_location_candidat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  civilite text, prenom text, nom text, email text, telephone text,
  date_naissance date, nationalite text, type_permis text, etat_civil text,
  adresse_actuelle text, loyer_actuel numeric, motif_changement text,
  profession text, employeur text, type_contrat text, revenus_mensuels numeric,
  nombre_occupants integer, date_entree_souhaitee date,
  region_recherchee text, budget_max numeric, pieces_min numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.demandes_location_candidat TO authenticated;
GRANT ALL ON public.demandes_location_candidat TO service_role;
ALTER TABLE public.demandes_location_candidat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidat gère sa demande (select)" ON public.demandes_location_candidat FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Candidat gère sa demande (insert)" ON public.demandes_location_candidat FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_candidat(auth.uid()));
CREATE POLICY "Candidat gère sa demande (update)" ON public.demandes_location_candidat FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff lit les demandes" ON public.demandes_location_candidat FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

-- candidatures : lecture de ses propres lignes
CREATE POLICY "Candidat lit ses candidatures" ON public.candidatures FOR SELECT TO authenticated
USING (public.is_candidat(auth.uid()) AND client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- candidatures_location : lecture / mise à jour limitée
CREATE POLICY "Candidat lit ses candidatures location" ON public.candidatures_location FOR SELECT TO authenticated
USING (public.is_candidat(auth.uid()) AND (user_id = auth.uid() OR (email IS NOT NULL AND lower(email) = public.current_auth_email())));
CREATE POLICY "Candidat met à jour ses candidatures location" ON public.candidatures_location FOR UPDATE TO authenticated
USING (public.is_candidat(auth.uid()) AND (user_id = auth.uid() OR (email IS NOT NULL AND lower(email) = public.current_auth_email())))
WITH CHECK (public.is_candidat(auth.uid()) AND (user_id = auth.uid() OR (email IS NOT NULL AND lower(email) = public.current_auth_email())));

CREATE OR REPLACE FUNCTION public.protect_candidature_location_staff_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_candidat(auth.uid())
     AND NOT public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'agent') THEN
    NEW.statut := OLD.statut; NEW.score_dossier := OLD.score_dossier; NEW.note_agent := OLD.note_agent;
    NEW.motif_refus := OLD.motif_refus; NEW.lot_id := OLD.lot_id; NEW.date_visite := OLD.date_visite;
    NEW.user_id := COALESCE(OLD.user_id, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_protect_candidature_location_staff_fields BEFORE UPDATE ON public.candidatures_location
FOR EACH ROW EXECUTE FUNCTION public.protect_candidature_location_staff_fields();

-- documents : ses propres pièces
CREATE POLICY "Candidat lit ses documents" ON public.documents FOR SELECT TO authenticated
USING (public.is_candidat(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Candidat ajoute ses documents" ON public.documents FOR INSERT TO authenticated
WITH CHECK (public.is_candidat(auth.uid()) AND user_id = auth.uid());

-- Switch candidat -> client
CREATE OR REPLACE FUNCTION public.activate_candidat_searches()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.is_candidat(_uid) THEN
    RAISE EXCEPTION 'Réservé aux candidats';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'client') ON CONFLICT (user_id, role) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE user_id = _uid) THEN
    INSERT INTO public.clients(user_id) VALUES (_uid);
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.activate_candidat_searches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_candidat_searches() TO authenticated;