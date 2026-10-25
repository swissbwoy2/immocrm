-- Parcours ACHAT de bout en bout (25.10.2026)
-- Signature du mandat → recherche → visite → offre d'achat → négociation → notaire → remise des clés.
-- Idempotente. Additive : aucune donnée existante n'est supprimée, le parcours location n'est pas modifié
-- (sauf : la notification « statut d'offre » n'est plus envoyée au client pour ses propres actions).
-- Les annonces de location automatiques ne sont PAS bloquées pour les acheteurs (projets multiples possibles).

-- ============================================================================
-- 0) Aides
-- ============================================================================

-- Un client est-il acheteur ? (même règle que src/lib/journey.ts isPurchaseBuyer)
CREATE OR REPLACE FUNCTION public.client_est_acheteur(p_client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id
      AND (
        lower(coalesce(c.type_recherche, '')) IN ('acheter', 'achat', 'purchase', 'purchase_search')
        OR lower(coalesce(c.journey_type, '')) = 'purchase_search'
        OR EXISTS (SELECT 1 FROM public.purchase_projects pp WHERE pp.client_id = c.id)
      )
  );
$$;

-- L'utilisateur courant est-il le conseiller (assigné au projet, ou agent du client) ?
CREATE OR REPLACE FUNCTION public.est_conseiller_projet_achat(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.purchase_projects p
    WHERE p.id = p_project_id
      AND (p.assigned_agent_id = public.get_my_agent_id() OR public.is_agent_of_client(p.client_id))
  );
$$;

-- Personnel (admin ou agent) ?
CREATE OR REPLACE FUNCTION public.est_personnel()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role) OR public.get_my_agent_id() IS NOT NULL;
$$;

-- Coche une étape du projet (sans notifier : la notification est portée par l'événement qui la déclenche).
CREATE OR REPLACE FUNCTION public.achat_cocher_etape(p_project_id uuid, p_step_key text, p_statut text DEFAULT 'fait')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_prec text := coalesce(current_setting('achat.sync', true), '');
BEGIN
  PERFORM set_config('achat.sync', '1', true);
  UPDATE public.purchase_project_steps
     SET statut = p_statut,
         date_fait = CASE WHEN p_statut = 'fait' THEN coalesce(date_fait, now()) ELSE date_fait END
   WHERE project_id = p_project_id
     AND step_key = p_step_key
     AND statut IS DISTINCT FROM 'fait'
     AND NOT (p_statut = 'en_cours' AND statut = 'en_cours');
  PERFORM set_config('achat.sync', v_prec, true);
END;
$$;

-- Notification au client d'un projet d'achat.
CREATE OR REPLACE FUNCTION public.achat_notifier_client(p_project_id uuid, p_titre text, p_message text, p_lien text DEFAULT '/client', p_meta jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_user uuid; v_client uuid;
BEGIN
  SELECT c.user_id, c.id INTO v_user, v_client
    FROM public.purchase_projects p JOIN public.clients c ON c.id = p.client_id
   WHERE p.id = p_project_id;
  IF v_user IS NULL THEN RETURN; END IF;
  -- Le client n'est pas notifié de ses propres actions.
  IF auth.uid() IS NOT NULL AND auth.uid() = v_user THEN RETURN; END IF;
  PERFORM public.create_notification(
    p_user_id  => v_user,
    p_type     => 'achat_update',
    p_title    => p_titre,
    p_message  => coalesce(p_message, ''),
    p_link     => p_lien,
    -- Clés de métadonnées volontairement distinctes de client_id / offre_id : create_notification
    -- regroupe les notifications d'un même type sur ces clés pendant 10 minutes, ce qui ferait
    -- disparaître les étapes successives (banque, offre, notaire…) saisies dans la même séance.
    -- Sans ces clés, le regroupement ne se fait que sur un titre identique (vrai doublon).
    p_metadata => coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('projet_achat_id', p_project_id, 'client_achat_id', v_client)
  );
END;
$$;

-- ============================================================================
-- 1) Droits : le conseiller du client voit et gère le projet d'achat
--    (avant : seulement si purchase_projects.assigned_agent_id était rempli — 3 projets sur 4 ne l'étaient pas)
-- ============================================================================
UPDATE public.purchase_projects p
   SET assigned_agent_id = c.agent_id
  FROM public.clients c
 WHERE c.id = p.client_id AND p.assigned_agent_id IS NULL AND c.agent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.purchase_projects_agent_par_defaut()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_agent_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT agent_id INTO NEW.assigned_agent_id FROM public.clients WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_projects_agent_par_defaut ON public.purchase_projects;
CREATE TRIGGER trg_purchase_projects_agent_par_defaut
  BEFORE INSERT ON public.purchase_projects
  FOR EACH ROW EXECUTE FUNCTION public.purchase_projects_agent_par_defaut();

DROP POLICY IF EXISTS "Agent du client voit le projet achat" ON public.purchase_projects;
CREATE POLICY "Agent du client voit le projet achat" ON public.purchase_projects
  FOR SELECT TO authenticated USING (public.is_agent_of_client(client_id));
DROP POLICY IF EXISTS "Agent du client modifie le projet achat" ON public.purchase_projects;
CREATE POLICY "Agent du client modifie le projet achat" ON public.purchase_projects
  FOR UPDATE TO authenticated USING (public.is_agent_of_client(client_id)) WITH CHECK (public.is_agent_of_client(client_id));
DROP POLICY IF EXISTS "Agent du client cree le projet achat" ON public.purchase_projects;
CREATE POLICY "Agent du client cree le projet achat" ON public.purchase_projects
  FOR INSERT TO authenticated WITH CHECK (public.is_agent_of_client(client_id));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['purchase_financing_profiles','purchase_selected_properties','purchase_visit_reports',
                           'purchase_negotiations','purchase_notary_steps','purchase_project_steps']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Conseiller du client gere %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Conseiller du client gere %1$s" ON public.%1$I FOR ALL TO authenticated
                    USING (public.est_conseiller_projet_achat(project_id))
                    WITH CHECK (public.est_conseiller_projet_achat(project_id))', t);
  END LOOP;
END $$;

-- ============================================================================
-- 2) Lien bien proposé (offres) ↔ dossier d'achat
-- ============================================================================
ALTER TABLE public.purchase_selected_properties ADD COLUMN IF NOT EXISTS offre_id uuid REFERENCES public.offres(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_negotiations      ADD COLUMN IF NOT EXISTS offre_id uuid REFERENCES public.offres(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_selected_properties_offre ON public.purchase_selected_properties(offre_id);
CREATE INDEX IF NOT EXISTS idx_purchase_negotiations_offre ON public.purchase_negotiations(offre_id);

-- ============================================================================
-- 3) Statut bancaire : valeurs uniques sans accent
-- ============================================================================
UPDATE public.purchase_financing_profiles SET statut_bancaire = 'prevalide' WHERE statut_bancaire IN ('prevalidé', 'prévalidé', 'validation_orale');
UPDATE public.purchase_financing_profiles SET statut_bancaire = 'bloque'    WHERE statut_bancaire IN ('bloqué');
UPDATE public.purchase_financing_profiles SET statut_bancaire = 'en_analyse' WHERE statut_bancaire IN ('en_cours');

-- Le client peut compléter son financement, mais seuls admin et conseiller décident du volet bancaire.
CREATE OR REPLACE FUNCTION public.purchase_financing_proteger_volet_bancaire()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.est_personnel() THEN
    NEW.statut_bancaire     := OLD.statut_bancaire;
    NEW.partenaire_financier := OLD.partenaire_financier;
    NEW.commentaire_banque  := OLD.commentaire_banque;
    NEW.date_envoi_banque   := OLD.date_envoi_banque;
    NEW.date_retour_banque  := OLD.date_retour_banque;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_financing_proteger ON public.purchase_financing_profiles;
CREATE TRIGGER trg_purchase_financing_proteger
  BEFORE UPDATE ON public.purchase_financing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.purchase_financing_proteger_volet_bancaire();

-- ============================================================================
-- 4) Projet : signature, acompte, activation, réussite
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_projects_dates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.statut_mandat = 'signe' AND NEW.date_signature_mandat IS NULL THEN NEW.date_signature_mandat := current_date; END IF;
  IF NEW.statut_acompte = 'paye' AND NEW.date_paiement_acompte IS NULL THEN NEW.date_paiement_acompte := current_date; END IF;
  IF NEW.statut = 'actif' AND NEW.date_debut_progression IS NULL THEN NEW.date_debut_progression := current_date; END IF;
  IF NEW.statut IN ('reussi', 'cloture') AND NEW.date_fin_progression IS NULL THEN NEW.date_fin_progression := current_date; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_projects_dates ON public.purchase_projects;
CREATE TRIGGER trg_purchase_projects_dates
  BEFORE INSERT OR UPDATE ON public.purchase_projects
  FOR EACH ROW EXECUTE FUNCTION public.purchase_projects_dates();

CREATE OR REPLACE FUNCTION public.purchase_projects_suivi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.statut_mandat = 'signe' AND (TG_OP = 'INSERT' OR OLD.statut_mandat IS DISTINCT FROM 'signe') THEN
    PERFORM public.achat_cocher_etape(NEW.id, 'mandat_signe');
  END IF;
  IF NEW.statut_acompte = 'paye' AND (TG_OP = 'INSERT' OR OLD.statut_acompte IS DISTINCT FROM 'paye') THEN
    PERFORM public.achat_cocher_etape(NEW.id, 'acompte_paye');
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.statut IS DISTINCT FROM OLD.statut THEN
    IF NEW.statut = 'actif' AND OLD.statut = 'en_attente_activation' THEN
      PERFORM public.achat_notifier_client(NEW.id, 'Votre accompagnement achat est activé',
        'Votre conseiller démarre la recherche active de votre bien, sur le marché et hors marché.', '/client');
    ELSIF NEW.statut = 'reussi' THEN
      PERFORM public.achat_notifier_client(NEW.id, 'Félicitations pour votre achat !',
        'Votre projet d''achat est finalisé. Toute l''équipe Immo-Rama vous souhaite beaucoup de bonheur dans votre nouveau bien.', '/client');
    ELSIF NEW.statut = 'en_pause' THEN
      PERFORM public.achat_notifier_client(NEW.id, 'Votre accompagnement achat est en pause',
        'Votre conseiller reste à votre disposition pour le reprendre.', '/client');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_projects_suivi ON public.purchase_projects;
CREATE TRIGGER trg_purchase_projects_suivi
  AFTER INSERT OR UPDATE ON public.purchase_projects
  FOR EACH ROW EXECUTE FUNCTION public.purchase_projects_suivi();

-- Les étapes créées après le projet reprennent l'état déjà acquis (mandat signé, acompte payé).
CREATE OR REPLACE FUNCTION public.purchase_steps_etat_initial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_mandat text; v_acompte text;
BEGIN
  SELECT statut_mandat, statut_acompte INTO v_mandat, v_acompte FROM public.purchase_projects WHERE id = NEW.project_id;
  IF (NEW.step_key = 'mandat_signe' AND v_mandat = 'signe') OR (NEW.step_key = 'acompte_paye' AND v_acompte = 'paye') THEN
    NEW.statut := 'fait';
    NEW.date_fait := coalesce(NEW.date_fait, now());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_steps_etat_initial ON public.purchase_project_steps;
CREATE TRIGGER trg_purchase_steps_etat_initial
  BEFORE INSERT ON public.purchase_project_steps
  FOR EACH ROW EXECUTE FUNCTION public.purchase_steps_etat_initial();

-- Étape cochée à la main par le conseiller → le client est prévenu.
CREATE OR REPLACE FUNCTION public.purchase_steps_notifier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF coalesce(current_setting('achat.sync', true), '') = '1' THEN RETURN NEW; END IF;
  IF NEW.statut = 'fait' AND OLD.statut IS DISTINCT FROM 'fait' THEN
    PERFORM public.achat_notifier_client(NEW.project_id, 'Étape franchie : ' || coalesce(NEW.label, NEW.step_key),
      'Votre projet d''achat avance. Retrouvez le détail dans votre tableau de bord.', '/client',
      jsonb_build_object('step_key', NEW.step_key));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_steps_notifier ON public.purchase_project_steps;
CREATE TRIGGER trg_purchase_steps_notifier
  AFTER UPDATE OF statut ON public.purchase_project_steps
  FOR EACH ROW EXECUTE FUNCTION public.purchase_steps_notifier();

-- ============================================================================
-- 5) Financement : statut bancaire → étapes + client prévenu
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_financing_suivi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_titre text; v_msg text;
BEGIN
  IF NEW.statut_bancaire IS NOT DISTINCT FROM OLD.statut_bancaire THEN RETURN NEW; END IF;
  IF NEW.statut_bancaire IN ('en_analyse', 'prevalide', 'valide', 'refuse', 'bloque') THEN
    PERFORM public.achat_cocher_etape(NEW.project_id, 'envoi_banque');
  END IF;
  IF NEW.statut_bancaire = 'valide' THEN
    PERFORM public.achat_cocher_etape(NEW.project_id, 'validation_bancaire');
  END IF;
  v_titre := CASE NEW.statut_bancaire
    WHEN 'en_analyse' THEN 'Votre dossier est chez notre partenaire bancaire'
    WHEN 'prevalide'  THEN 'Bonne nouvelle : financement prévalidé'
    WHEN 'valide'     THEN 'Votre financement est validé'
    WHEN 'refuse'     THEN 'Financement : votre conseiller vous recontacte'
    WHEN 'bloque'     THEN 'Financement : un point est à régler'
    ELSE NULL END;
  v_msg := CASE NEW.statut_bancaire
    WHEN 'en_analyse' THEN 'Réponse attendue en général sous 24 à 48 heures.'
    WHEN 'prevalide'  THEN 'Vous pouvez visiter et vous positionner sereinement.'
    WHEN 'valide'     THEN 'Vous pouvez faire une offre d''achat en toute sécurité.'
    ELSE 'Votre conseiller vous explique la suite et les solutions possibles.' END;
  IF v_titre IS NOT NULL THEN
    PERFORM public.achat_notifier_client(NEW.project_id, v_titre, v_msg, '/client/financement');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_financing_suivi ON public.purchase_financing_profiles;
CREATE TRIGGER trg_purchase_financing_suivi
  AFTER UPDATE OF statut_bancaire ON public.purchase_financing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.purchase_financing_suivi();

-- ============================================================================
-- 6) Offre d'achat : le souhait du client ouvre la négociation dans le dossier du conseiller
-- ============================================================================
CREATE OR REPLACE FUNCTION public.achat_ouvrir_negociation(p_offre_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE o record; v_project uuid; v_property uuid; v_nego uuid;
BEGIN
  SELECT * INTO o FROM public.offres WHERE id = p_offre_id;
  IF o.id IS NULL THEN RETURN NULL; END IF;
  -- Seulement pour un bien à vendre (un client peut aussi louer : une location n'ouvre jamais de négociation d'achat).
  IF coalesce(o.prix, 0) < 50000 THEN RETURN NULL; END IF;
  SELECT id INTO v_project FROM public.purchase_projects WHERE client_id = o.client_id ORDER BY created_at LIMIT 1;
  IF v_project IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_property FROM public.purchase_selected_properties WHERE offre_id = o.id LIMIT 1;
  IF v_property IS NULL THEN
    INSERT INTO public.purchase_selected_properties
      (project_id, offre_id, titre, adresse, prix, surface, pieces, type_bien, lien_annonce, source, statut, notes, annee_construction)
    VALUES
      (v_project, o.id, o.titre, o.adresse, o.prix, o.surface, o.pieces, o.type_bien, o.lien_annonce, 'bien_propose', 'offre_recommandee',
       'Bien proposé dans Logisorama : le client souhaite faire une offre.', o.annee_construction)
    RETURNING id INTO v_property;
  ELSE
    UPDATE public.purchase_selected_properties SET statut = 'offre_recommandee' WHERE id = v_property AND statut IS DISTINCT FROM 'offre_envoyee';
  END IF;

  SELECT id INTO v_nego FROM public.purchase_negotiations WHERE offre_id = o.id LIMIT 1;
  IF v_nego IS NULL THEN
    INSERT INTO public.purchase_negotiations (project_id, property_id, offre_id, statut, notes)
    VALUES (v_project, v_property, o.id, 'en_preparation', 'Souhait d''offre exprimé par le client depuis Biens proposés.')
    RETURNING id INTO v_nego;
  END IF;

  PERFORM public.achat_cocher_etape(v_project, 'offre_envoyee', 'en_cours');
  RETURN v_nego;
END;
$$;

-- Déclenché quel que soit l'auteur (client depuis l'app, conseiller depuis Offres envoyées).
CREATE OR REPLACE FUNCTION public.offres_achat_ouvrir_negociation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.statut = 'offre_envisagee' AND OLD.statut IS DISTINCT FROM 'offre_envisagee' THEN
    PERFORM public.achat_ouvrir_negociation(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_offres_achat_ouvrir_negociation ON public.offres;
CREATE TRIGGER trg_offres_achat_ouvrir_negociation
  AFTER UPDATE OF statut ON public.offres
  FOR EACH ROW EXECUTE FUNCTION public.offres_achat_ouvrir_negociation();

-- Le client précise le montant envisagé (il n'a pas de droit d'écriture direct sur la négociation).
CREATE OR REPLACE FUNCTION public.achat_enregistrer_souhait_offre(p_offre_id uuid, p_montant numeric DEFAULT NULL, p_commentaire text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_nego uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.offres o JOIN public.clients c ON c.id = o.client_id
     WHERE o.id = p_offre_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bien introuvable';
  END IF;
  v_nego := public.achat_ouvrir_negociation(p_offre_id);
  IF v_nego IS NOT NULL THEN
    UPDATE public.purchase_negotiations
       SET montant_offre = coalesce(nullif(p_montant, 0), montant_offre),
           notes = CASE WHEN nullif(trim(coalesce(p_commentaire, '')), '') IS NULL THEN notes
                        ELSE trim(coalesce(notes, '') || E'\nMessage du client : ' || p_commentaire) END
     WHERE id = v_nego AND statut = 'en_preparation';
  END IF;
  RETURN v_nego;
END;
$$;
REVOKE ALL ON FUNCTION public.achat_enregistrer_souhait_offre(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.achat_enregistrer_souhait_offre(uuid, numeric, text) TO authenticated;

-- ============================================================================
-- 7) Négociation → étapes, bien proposé et client prévenu
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_negotiations_suivi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_titre text; v_msg text; v_montant text; v_lien text; v_prec text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.statut IS NOT DISTINCT FROM OLD.statut
     AND NEW.contre_offre IS NOT DISTINCT FROM OLD.contre_offre THEN
    RETURN NEW;
  END IF;
  v_lien := CASE WHEN NEW.offre_id IS NOT NULL THEN '/client/biens-proposes?offreId=' || NEW.offre_id ELSE '/client' END;

  IF NEW.statut IN ('envoyee', 'contre_offre', 'acceptee', 'refusee') THEN
    PERFORM public.achat_cocher_etape(NEW.project_id, 'offre_envoyee');
  END IF;
  IF NEW.statut = 'contre_offre' THEN
    PERFORM public.achat_cocher_etape(NEW.project_id, 'negociation', 'en_cours');
  END IF;
  IF NEW.statut = 'acceptee' THEN
    PERFORM public.achat_cocher_etape(NEW.project_id, 'negociation');
    IF NEW.date_acceptation IS NULL THEN
      UPDATE public.purchase_negotiations SET date_acceptation = current_date WHERE id = NEW.id;
    END IF;
    IF NEW.offre_id IS NOT NULL THEN
      v_prec := coalesce(current_setting('achat.sync', true), '');
      PERFORM set_config('achat.sync', '1', true);
      UPDATE public.offres SET statut = 'acceptee', updated_at = now() WHERE id = NEW.offre_id AND statut IS DISTINCT FROM 'acceptee';
      PERFORM set_config('achat.sync', v_prec, true);
    END IF;
  END IF;
  IF NEW.statut = 'envoyee' AND NEW.date_offre IS NULL THEN
    UPDATE public.purchase_negotiations SET date_offre = current_date WHERE id = NEW.id;
  END IF;

  v_montant := CASE
    WHEN NEW.statut = 'contre_offre' AND NEW.contre_offre IS NOT NULL THEN ' (CHF ' || replace(to_char(NEW.contre_offre, 'FM999G999G999'), ',', '''') || ')'
    WHEN NEW.montant_offre IS NOT NULL THEN ' (CHF ' || replace(to_char(NEW.montant_offre, 'FM999G999G999'), ',', '''') || ')'
    ELSE '' END;
  v_titre := CASE NEW.statut
    WHEN 'envoyee'      THEN 'Votre offre d''achat a été transmise au vendeur'
    WHEN 'contre_offre' THEN 'Le vendeur a fait une contre-offre'
    WHEN 'acceptee'     THEN 'Votre offre d''achat est acceptée 🎉'
    WHEN 'refusee'      THEN 'Votre offre n''a pas été retenue'
    ELSE NULL END;
  v_msg := CASE NEW.statut
    WHEN 'envoyee'      THEN 'Montant proposé' || v_montant || '. Votre conseiller vous tient informé de la réponse.'
    WHEN 'contre_offre' THEN 'Contre-offre' || v_montant || '. Votre conseiller vous appelle pour en discuter.'
    WHEN 'acceptee'     THEN 'Prochaine étape : le rendez-vous chez le notaire, organisé par votre conseiller.'
    WHEN 'refusee'      THEN 'Votre conseiller poursuit la recherche et vous propose d''autres biens.'
    ELSE NULL END;
  IF v_titre IS NOT NULL THEN
    PERFORM public.achat_notifier_client(NEW.project_id, v_titre, v_msg, v_lien,
      jsonb_build_object('offre_achat_id', NEW.offre_id, 'negociation_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;
-- Négociation saisie à la main : le lien vers le bien proposé est repris du bien choisi.
CREATE OR REPLACE FUNCTION public.purchase_negotiations_lien_offre()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.offre_id IS NULL AND NEW.property_id IS NOT NULL THEN
    SELECT offre_id INTO NEW.offre_id FROM public.purchase_selected_properties WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_negotiations_lien_offre ON public.purchase_negotiations;
CREATE TRIGGER trg_purchase_negotiations_lien_offre
  BEFORE INSERT OR UPDATE OF property_id ON public.purchase_negotiations
  FOR EACH ROW EXECUTE FUNCTION public.purchase_negotiations_lien_offre();

DROP TRIGGER IF EXISTS trg_purchase_negotiations_suivi ON public.purchase_negotiations;
CREATE TRIGGER trg_purchase_negotiations_suivi
  AFTER INSERT OR UPDATE ON public.purchase_negotiations
  FOR EACH ROW EXECUTE FUNCTION public.purchase_negotiations_suivi();

-- ============================================================================
-- 8) Notaire : rendez-vous, signature de l'acte, remise des clés → étapes, fin du projet, client prévenu
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_notary_suivi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_old_rdv timestamptz; v_old_sign date; v_old_cles date; v_old_statut text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old_rdv := OLD.date_rdv; v_old_sign := OLD.date_signature; v_old_cles := OLD.date_remise_cles; v_old_statut := OLD.statut;
  END IF;

  -- Rendez-vous notaire fixé ou déplacé
  IF NEW.date_rdv IS NOT NULL AND NEW.date_rdv IS DISTINCT FROM v_old_rdv THEN
    PERFORM public.achat_cocher_etape(NEW.project_id, 'rdv_notaire');
    PERFORM public.achat_notifier_client(NEW.project_id, 'Rendez-vous chez le notaire fixé',
      'Le ' || to_char(NEW.date_rdv AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY à HH24:MI')
        || coalesce(' chez ' || NEW.notaire_nom, '') || '. Votre conseiller vous accompagne.', '/client');
  END IF;

  -- Acte authentique signé
  IF (NEW.statut IN ('signe', 'cles_remises') AND v_old_statut IS DISTINCT FROM NEW.statut AND coalesce(v_old_statut, '') NOT IN ('signe', 'cles_remises'))
     OR (NEW.date_signature IS NOT NULL AND v_old_sign IS NULL AND NEW.date_signature <= current_date) THEN
    PERFORM public.achat_cocher_etape(NEW.project_id, 'rdv_notaire');
    PERFORM public.achat_cocher_etape(NEW.project_id, 'signature_notariee');
    PERFORM public.achat_notifier_client(NEW.project_id, 'Acte authentique signé 🎉',
      'Vous êtes officiellement propriétaire. Prochaine étape : la remise des clés.', '/client');
  END IF;

  -- Date de remise des clés annoncée (future)
  IF NEW.date_remise_cles IS NOT NULL AND NEW.date_remise_cles IS DISTINCT FROM v_old_cles
     AND NEW.date_remise_cles > current_date AND NEW.statut IS DISTINCT FROM 'cles_remises' THEN
    PERFORM public.achat_notifier_client(NEW.project_id, 'Remise des clés prévue',
      'Le ' || to_char(NEW.date_remise_cles, 'DD.MM.YYYY') || '.', '/client');
  END IF;

  -- Clés remises : fin du parcours
  IF NEW.statut = 'cles_remises' AND v_old_statut IS DISTINCT FROM 'cles_remises' THEN
    PERFORM public.achat_cocher_etape(NEW.project_id, 'signature_notariee');
    PERFORM public.achat_cocher_etape(NEW.project_id, 'remise_cles');
    IF NEW.date_remise_cles IS NULL THEN
      UPDATE public.purchase_notary_steps SET date_remise_cles = current_date WHERE id = NEW.id;
    END IF;
    UPDATE public.purchase_projects SET statut = 'reussi' WHERE id = NEW.project_id AND statut NOT IN ('reussi', 'cloture');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_notary_suivi ON public.purchase_notary_steps;
CREATE TRIGGER trg_purchase_notary_suivi
  AFTER INSERT OR UPDATE ON public.purchase_notary_steps
  FOR EACH ROW EXECUTE FUNCTION public.purchase_notary_suivi();

-- Remise des clés cochée à la main dans les étapes : le projet est aussi finalisé.
CREATE OR REPLACE FUNCTION public.purchase_steps_fin_projet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.step_key = 'remise_cles' AND NEW.statut = 'fait' AND OLD.statut IS DISTINCT FROM 'fait' THEN
    UPDATE public.purchase_projects SET statut = 'reussi' WHERE id = NEW.project_id AND statut NOT IN ('reussi', 'cloture');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_steps_fin_projet ON public.purchase_project_steps;
CREATE TRIGGER trg_purchase_steps_fin_projet
  AFTER UPDATE OF statut ON public.purchase_project_steps
  FOR EACH ROW EXECUTE FUNCTION public.purchase_steps_fin_projet();

-- ============================================================================
-- 9) Compte-rendu de visite envoyé à un acheteur → le bien passe à « visité »
-- ============================================================================
CREATE OR REPLACE FUNCTION public.vcr_achat_bien_visite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_offre uuid; v_prec text;
BEGIN
  IF NEW.envoye_au_client_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.envoye_au_client_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NOT public.client_est_acheteur(NEW.client_id) THEN RETURN NEW; END IF;
  v_offre := coalesce(NEW.offre_id, (SELECT offre_id FROM public.visites WHERE id = NEW.visite_id));
  -- Client à projets multiples : seule une visite de bien à vendre fait avancer le dossier d'achat.
  IF v_offre IS NULL OR coalesce((SELECT prix FROM public.offres WHERE id = v_offre), 0) < 50000 THEN RETURN NEW; END IF;
  -- Le client est déjà prévenu du compte-rendu : pas de seconde notification « Visite effectuée ».
  v_prec := coalesce(current_setting('achat.sync', true), '');
  PERFORM set_config('achat.sync', '1', true);
  UPDATE public.offres SET statut = 'visite_effectuee', updated_at = now()
   WHERE id = v_offre AND statut IN ('envoyee', 'vue', 'interesse', 'visite_planifiee', 'visite_confirmee');
  PERFORM set_config('achat.sync', v_prec, true);
  PERFORM public.achat_cocher_etape(pp.id, 'visite_courtier') FROM public.purchase_projects pp WHERE pp.client_id = NEW.client_id;
  PERFORM public.achat_cocher_etape(pp.id, 'rapport_visite') FROM public.purchase_projects pp WHERE pp.client_id = NEW.client_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_vcr_achat_bien_visite ON public.visite_comptes_rendus;
CREATE TRIGGER trg_vcr_achat_bien_visite
  AFTER INSERT OR UPDATE OF envoye_au_client_at ON public.visite_comptes_rendus
  FOR EACH ROW EXECUTE FUNCTION public.vcr_achat_bien_visite();

-- ============================================================================
-- 10) (volontairement absent) Annonces de location automatiques : AUCUN blocage pour les acheteurs.
--     Certains clients ont plusieurs projets en même temps (louer ET acheter, parfois vendre) :
--     ils doivent continuer à recevoir les annonces de location.
-- ============================================================================

-- ============================================================================
-- 11) Notification « statut d'offre » au client
--     - pas pour ses propres actions (il vient de cliquer) ni pour les synchronisations internes ;
--     - un acheteur est envoyé vers « Biens proposés », avec les libellés achat.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_offre_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_label text;
  v_achat boolean;
BEGIN
  IF NEW.statut IS NOT DISTINCT FROM OLD.statut THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('achat.sync', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  SELECT c.user_id INTO v_user_id FROM public.clients c WHERE c.id = NEW.client_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() = v_user_id THEN
    RETURN NEW;
  END IF;

  -- Bien à l'achat : client acheteur ET prix de vente (un client peut louer et acheter en même temps ;
  -- une annonce de location — loyer mensuel — garde alors les libellés et le lien location).
  v_achat := public.client_est_acheteur(NEW.client_id) AND coalesce(NEW.prix, 0) >= 50000;

  v_label := CASE NEW.statut
    WHEN 'envoyee' THEN CASE WHEN v_achat THEN 'Nouveau bien proposé' ELSE 'Nouvelle offre reçue' END
    WHEN 'interesse' THEN 'Intérêt enregistré'
    WHEN 'visite_planifiee' THEN 'Visite planifiée'
    WHEN 'visite_confirmee' THEN 'Visite confirmée'
    WHEN 'visite_effectuee' THEN 'Visite effectuée'
    WHEN 'souhaite_postuler' THEN 'Vous souhaitez postuler'
    WHEN 'offre_envisagee' THEN 'Offre d''achat en préparation'
    WHEN 'candidature_deposee' THEN 'Candidature déposée'
    WHEN 'acceptee' THEN CASE WHEN v_achat THEN 'Votre offre d''achat est acceptée' ELSE 'Offre acceptée' END
    WHEN 'refusee' THEN CASE WHEN v_achat THEN 'Bien écarté' ELSE 'Offre refusée' END
    ELSE 'Statut mis à jour: ' || NEW.statut
  END;

  PERFORM public.create_notification(
    p_user_id  => v_user_id,
    p_type     => 'offre_status_change',
    p_title    => v_label,
    p_message  => COALESCE(NEW.adresse, ''),
    p_link     => CASE WHEN v_achat THEN '/client/biens-proposes?offreId=' || NEW.id
                       WHEN public.client_est_acheteur(NEW.client_id) THEN '/client/offres-recues?location=1&offreId=' || NEW.id
                       ELSE '/client/offres-recues' END,
    p_metadata => jsonb_build_object('offre_id', NEW.id, 'statut', NEW.statut)
  );

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 12) Rapport de visite saisi dans le dossier d'achat → client prévenu, étape cochée
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_visit_reports_suivi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.achat_cocher_etape(NEW.project_id, 'visite_courtier');
  PERFORM public.achat_cocher_etape(NEW.project_id, 'rapport_visite');
  PERFORM public.achat_notifier_client(NEW.project_id, 'Rapport de visite disponible',
    'Votre conseiller a rédigé son analyse du bien visité. Retrouvez-la dans votre tableau de bord.', '/client',
    jsonb_build_object('rapport_id', NEW.id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_purchase_visit_reports_suivi ON public.purchase_visit_reports;
CREATE TRIGGER trg_purchase_visit_reports_suivi
  AFTER INSERT ON public.purchase_visit_reports
  FOR EACH ROW EXECUTE FUNCTION public.purchase_visit_reports_suivi();

-- ============================================================================
-- 13) Droits d'exécution : les fonctions internes ne sont appelables que par les déclencheurs
-- ============================================================================
REVOKE ALL ON FUNCTION public.achat_cocher_etape(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.achat_notifier_client(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.achat_ouvrir_negociation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.client_est_acheteur(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_est_acheteur(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.est_conseiller_projet_achat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.est_conseiller_projet_achat(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.est_personnel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.est_personnel() TO authenticated;
-- create_notification (existante) : laissée inchangée — le formulaire public /nouveau-mandat l'appelle
-- sans être connecté pour prévenir l'admin. À sécuriser séparément (fonction dédiée au formulaire public).
