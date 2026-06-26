
-- ============================================================
-- PARCOURS ACHAT IMMOBILIER — Tables principales
-- ============================================================

-- 1) Projet d'accompagnement achat
CREATE TABLE public.purchase_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid,
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,

  -- Statut opérationnel
  statut text NOT NULL DEFAULT 'acompte_a_payer',
  statut_mandat text DEFAULT 'non_signe',
  statut_acompte text DEFAULT 'a_payer',

  -- Montants (modifiables, valeurs par défaut indicatives)
  montant_mandat numeric DEFAULT 4999,
  montant_acompte numeric DEFAULT 2499,

  -- Progression opérationnelle visible client (60 jours)
  duree_progression_jours integer NOT NULL DEFAULT 60,
  date_debut_progression date,
  date_fin_progression date,

  -- Conditions juridiques (séparées de la progression visible)
  date_signature_mandat date,
  date_paiement_acompte date,
  conditions_renouvellement text,
  conditions_resiliation text,
  conditions_remboursement text,

  notes_internes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_projects TO authenticated;
GRANT ALL ON public.purchase_projects TO service_role;
ALTER TABLE public.purchase_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access purchase_projects"
  ON public.purchase_projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agent sees assigned purchase_projects"
  ON public.purchase_projects FOR SELECT TO authenticated
  USING (assigned_agent_id = public.get_my_agent_id());

CREATE POLICY "Agent updates assigned purchase_projects"
  ON public.purchase_projects FOR UPDATE TO authenticated
  USING (assigned_agent_id = public.get_my_agent_id());

CREATE POLICY "Client sees own purchase_projects"
  ON public.purchase_projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = purchase_projects.client_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_purchase_projects_client ON public.purchase_projects(client_id);
CREATE INDEX idx_purchase_projects_agent ON public.purchase_projects(assigned_agent_id);
CREATE INDEX idx_purchase_projects_user ON public.purchase_projects(user_id);

-- 2) Paramètres modifiables tenue des charges
CREATE TABLE public.purchase_financing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  value numeric NOT NULL,
  unit text DEFAULT '%',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.purchase_financing_settings TO authenticated;
GRANT ALL ON public.purchase_financing_settings TO service_role;
ALTER TABLE public.purchase_financing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads financing settings"
  ON public.purchase_financing_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages financing settings"
  ON public.purchase_financing_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.purchase_financing_settings (key, label, value, unit, description) VALUES
  ('taux_interet_theorique', 'Taux d''intérêt théorique', 5, '%', 'Taux retenu par les banques suisses pour le calcul de tenue des charges'),
  ('taux_entretien', 'Frais d''entretien et charges', 1, '%', 'Charges courantes annuelles estimées sur le prix du bien'),
  ('taux_amortissement', 'Amortissement', 1, '%', 'Amortissement annuel des 2/3 à 1/3 sur 15 ans'),
  ('taux_effort_max', 'Taux d''effort maximal', 33, '%', 'Charges théoriques / revenu annuel brut'),
  ('fonds_propres_min', 'Fonds propres minimum', 20, '%', 'Apport minimum exigé sur le prix d''achat'),
  ('frais_notaire', 'Frais de notaire', 5, '%', 'Frais d''acquisition estimés');

-- 3) Profil de financement
CREATE TABLE public.purchase_financing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.purchase_projects(id) ON DELETE CASCADE,

  -- REVENUS
  revenu_annuel_brut numeric DEFAULT 0,
  revenu_annuel_retenu numeric DEFAULT 0,
  bonus_3ans_moyenne numeric DEFAULT 0,
  allocations_familiales numeric DEFAULT 0,
  pensions_recues numeric DEFAULT 0,
  revenus_locatifs numeric DEFAULT 0,
  rentes_avs_ai_lpp numeric DEFAULT 0,
  autres_revenus numeric DEFAULT 0,
  nouveau_emploi boolean DEFAULT false,
  revenu_different_annee_precedente boolean DEFAULT false,

  -- FONDS PROPRES
  fonds_propres_cash numeric DEFAULT 0,
  fonds_propres_epargne numeric DEFAULT 0,
  fonds_propres_3a numeric DEFAULT 0,
  fonds_propres_lpp numeric DEFAULT 0,
  fonds_propres_libre_passage numeric DEFAULT 0,
  montant_epl_disponible numeric DEFAULT 0,
  placements numeric DEFAULT 0,
  donation_avance_hoirie numeric DEFAULT 0,

  -- ENGAGEMENTS / SITUATION FINANCIERE
  leasing_mensuel numeric DEFAULT 0,
  credit_prive_mensuel numeric DEFAULT 0,
  cartes_credit_mensuel numeric DEFAULT 0,
  pensions_versees numeric DEFAULT 0,
  autres_engagements numeric DEFAULT 0,
  poursuites boolean DEFAULT false,

  -- SITUATION FAMILIALE
  etat_civil text,
  nombre_enfants integer DEFAULT 0,
  date_naissance_acheteur_1 date,
  date_naissance_acheteur_2 date,

  -- AUTORISATIONS
  nationalite text,
  type_permis text,
  nationalite_2 text,
  type_permis_2 text,

  -- BIEN CIBLE
  prix_cible numeric DEFAULT 0,
  adresse_bien text,

  -- CALCULS DERIVES (snapshot calculé via fonction)
  fonds_propres_total numeric DEFAULT 0,
  fonds_propres_requis numeric DEFAULT 0,
  montant_hypothecaire_estime numeric DEFAULT 0,
  charges_theoriques_annuelles numeric DEFAULT 0,
  charges_theoriques_mensuelles numeric DEFAULT 0,
  taux_effort numeric DEFAULT 0,
  prix_max_finançable numeric DEFAULT 0,

  -- STATUT BANCAIRE
  statut_bancaire text DEFAULT 'a_evaluer',
  partenaire_financier text,
  date_envoi_banque date,
  date_retour_banque date,
  commentaire_banque text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_financing_profiles TO authenticated;
GRANT ALL ON public.purchase_financing_profiles TO service_role;
ALTER TABLE public.purchase_financing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access financing"
  ON public.purchase_financing_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agent sees assigned financing"
  ON public.purchase_financing_profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_projects p
      WHERE p.id = purchase_financing_profiles.project_id
        AND p.assigned_agent_id = public.get_my_agent_id()
    )
  );

CREATE POLICY "Client sees own financing"
  ON public.purchase_financing_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = purchase_financing_profiles.project_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Client updates own financing"
  ON public.purchase_financing_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = purchase_financing_profiles.project_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_purchase_financing_project ON public.purchase_financing_profiles(project_id);

-- 4) Biens sélectionnés
CREATE TABLE public.purchase_selected_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.purchase_projects(id) ON DELETE CASCADE,
  titre text,
  adresse text,
  npa text,
  ville text,
  lat numeric,
  lng numeric,
  prix numeric,
  surface numeric,
  pieces numeric,
  etage integer,
  annee_construction integer,
  type_bien text,
  lien_annonce text,
  source text,
  statut text DEFAULT 'a_analyser',
  score integer,
  notes text,
  prochaine_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_selected_properties TO authenticated;
GRANT ALL ON public.purchase_selected_properties TO service_role;
ALTER TABLE public.purchase_selected_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access selected properties"
  ON public.purchase_selected_properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agent manages assigned selected properties"
  ON public.purchase_selected_properties FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_projects p
      WHERE p.id = purchase_selected_properties.project_id
        AND p.assigned_agent_id = public.get_my_agent_id()
    )
  );

CREATE POLICY "Client sees own selected properties"
  ON public.purchase_selected_properties FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = purchase_selected_properties.project_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_purchase_selected_project ON public.purchase_selected_properties(project_id);

-- 5) Rapports visite courtier
CREATE TABLE public.purchase_visit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.purchase_selected_properties(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.purchase_projects(id) ON DELETE CASCADE,
  courtier_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  date_visite timestamptz,
  etat_general text,
  points_forts text,
  points_faibles text,
  risques text,
  documents_manquants text,
  estimation_prix numeric,
  avis_prix text,
  recommandation text,
  statut text DEFAULT 'a_analyser',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_visit_reports TO authenticated;
GRANT ALL ON public.purchase_visit_reports TO service_role;
ALTER TABLE public.purchase_visit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access visit reports"
  ON public.purchase_visit_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agent manages assigned visit reports"
  ON public.purchase_visit_reports FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_projects p
      WHERE p.id = purchase_visit_reports.project_id
        AND p.assigned_agent_id = public.get_my_agent_id()
    )
  );

CREATE POLICY "Client sees own visit reports"
  ON public.purchase_visit_reports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = purchase_visit_reports.project_id
        AND c.user_id = auth.uid()
    )
  );

-- 6) Négociations
CREATE TABLE public.purchase_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.purchase_projects(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.purchase_selected_properties(id) ON DELETE SET NULL,
  montant_offre numeric,
  contre_offre numeric,
  statut text DEFAULT 'en_preparation',
  historique jsonb DEFAULT '[]'::jsonb,
  date_offre date,
  date_reponse date,
  date_acceptation date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_negotiations TO authenticated;
GRANT ALL ON public.purchase_negotiations TO service_role;
ALTER TABLE public.purchase_negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access negotiations"
  ON public.purchase_negotiations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agent manages assigned negotiations"
  ON public.purchase_negotiations FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.purchase_projects p
      WHERE p.id = purchase_negotiations.project_id
        AND p.assigned_agent_id = public.get_my_agent_id())
  );

CREATE POLICY "Client sees own negotiations"
  ON public.purchase_negotiations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.purchase_projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = purchase_negotiations.project_id
        AND c.user_id = auth.uid())
  );

-- 7) Étapes notaire
CREATE TABLE public.purchase_notary_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.purchase_projects(id) ON DELETE CASCADE,
  notaire_nom text,
  notaire_email text,
  notaire_telephone text,
  date_rdv timestamptz,
  date_signature date,
  date_remise_cles date,
  statut text DEFAULT 'a_planifier',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_notary_steps TO authenticated;
GRANT ALL ON public.purchase_notary_steps TO service_role;
ALTER TABLE public.purchase_notary_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access notary"
  ON public.purchase_notary_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agent manages assigned notary"
  ON public.purchase_notary_steps FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.purchase_projects p
      WHERE p.id = purchase_notary_steps.project_id
        AND p.assigned_agent_id = public.get_my_agent_id())
  );

CREATE POLICY "Client sees own notary"
  ON public.purchase_notary_steps FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.purchase_projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = purchase_notary_steps.project_id
        AND c.user_id = auth.uid())
  );

-- 8) Étapes parcours (17 jalons)
CREATE TABLE public.purchase_project_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.purchase_projects(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  label text NOT NULL,
  ordre integer NOT NULL,
  statut text NOT NULL DEFAULT 'a_faire',
  date_fait timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, step_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_project_steps TO authenticated;
GRANT ALL ON public.purchase_project_steps TO service_role;
ALTER TABLE public.purchase_project_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access steps"
  ON public.purchase_project_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agent manages assigned steps"
  ON public.purchase_project_steps FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.purchase_projects p
      WHERE p.id = purchase_project_steps.project_id
        AND p.assigned_agent_id = public.get_my_agent_id())
  );

CREATE POLICY "Client sees own steps"
  ON public.purchase_project_steps FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.purchase_projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = purchase_project_steps.project_id
        AND c.user_id = auth.uid())
  );

-- 9) Extension de la table documents existante (réutilisée, même UX)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS purchase_project_id uuid REFERENCES public.purchase_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_category text;
CREATE INDEX IF NOT EXISTS idx_documents_purchase_project ON public.documents(purchase_project_id);

-- 10) Triggers updated_at
CREATE TRIGGER trg_purchase_projects_updated BEFORE UPDATE ON public.purchase_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_purchase_financing_updated BEFORE UPDATE ON public.purchase_financing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_purchase_selected_updated BEFORE UPDATE ON public.purchase_selected_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_purchase_visit_updated BEFORE UPDATE ON public.purchase_visit_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_purchase_negotiations_updated BEFORE UPDATE ON public.purchase_negotiations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_purchase_notary_updated BEFORE UPDATE ON public.purchase_notary_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_purchase_steps_updated BEFORE UPDATE ON public.purchase_project_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
