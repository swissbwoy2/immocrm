-- Phase 1: Module Propriétaire - Base de données complète

-- 1.1 Ajouter le rôle proprietaire à l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'proprietaire';

-- 1.2 Table proprietaires
CREATE TABLE public.proprietaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  civilite TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  canton TEXT,
  telephone TEXT,
  telephone_secondaire TEXT,
  iban TEXT,
  nom_banque TEXT,
  titulaire_compte TEXT,
  notes_admin TEXT,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'en_attente', 'suspendu')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT proprietaires_user_id_unique UNIQUE (user_id)
);

-- 1.3 Table immeubles (Biens immobiliers)
CREATE TABLE public.immeubles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  adresse TEXT NOT NULL,
  code_postal TEXT,
  ville TEXT,
  canton TEXT,
  pays TEXT DEFAULT 'Suisse',
  type_bien TEXT CHECK (type_bien IN ('immeuble', 'appartement', 'maison', 'commercial', 'mixte', 'terrain', 'parking')),
  nb_unites INTEGER DEFAULT 1,
  surface_totale NUMERIC,
  annee_construction INTEGER,
  -- Registre foncier
  numero_parcelle TEXT,
  commune_rf TEXT,
  folio_rf TEXT,
  -- État locatif
  etat_locatif_annuel NUMERIC DEFAULT 0,
  taux_vacance NUMERIC DEFAULT 0,
  -- Valeurs
  valeur_estimee NUMERIC,
  valeur_fiscale NUMERIC,
  valeur_assurance NUMERIC,
  date_derniere_estimation DATE,
  -- Statut
  statut TEXT DEFAULT 'gere' CHECK (statut IN ('gere', 'en_vente', 'en_location', 'vendu', 'vacant')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 Table lots (Appartements/locaux dans un immeuble)
CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  reference TEXT,
  designation TEXT,
  type_lot TEXT CHECK (type_lot IN ('appartement', 'studio', 'parking', 'cave', 'grenier', 'commercial', 'bureau', 'depot')),
  etage TEXT,
  nb_pieces NUMERIC,
  surface NUMERIC,
  loyer_actuel NUMERIC,
  charges_actuelles NUMERIC,
  provisions_chauffage NUMERIC,
  total_mensuel NUMERIC,
  -- Équipements
  equipements JSONB DEFAULT '[]'::jsonb,
  -- Statut
  statut TEXT DEFAULT 'occupe' CHECK (statut IN ('occupe', 'vacant', 'en_relocation', 'en_travaux', 'reserve')),
  date_liberation DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.5 Table locataires_immeuble
CREATE TABLE public.locataires_immeuble (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  -- Infos locataire
  civilite TEXT,
  prenom TEXT,
  nom TEXT NOT NULL,
  date_naissance DATE,
  nationalite TEXT,
  email TEXT,
  telephone TEXT,
  telephone_urgence TEXT,
  -- Coordonnées professionnelles
  profession TEXT,
  employeur TEXT,
  -- Dates
  date_entree DATE,
  date_sortie DATE,
  date_preavis DATE,
  -- Financier
  loyer NUMERIC,
  charges NUMERIC,
  total_mensuel NUMERIC,
  garantie NUMERIC,
  type_garantie TEXT CHECK (type_garantie IN ('bancaire', 'depot', 'caution_solidaire', 'assurance')),
  numero_garantie TEXT,
  -- Solde
  solde_locataire NUMERIC DEFAULT 0,
  -- Statut
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'preavis', 'sorti', 'litige')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.6 Table baux
CREATE TABLE public.baux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  locataire_id UUID REFERENCES locataires_immeuble(id) ON DELETE SET NULL,
  -- Dates
  date_debut DATE NOT NULL,
  date_fin DATE,
  duree_initiale TEXT,
  preavis_mois INTEGER DEFAULT 3,
  -- Montants
  loyer_initial NUMERIC,
  loyer_actuel NUMERIC,
  provisions_chauffage NUMERIC,
  provisions_eau NUMERIC,
  autres_charges NUMERIC,
  total_mensuel NUMERIC,
  -- Indexation
  indice_reference TEXT,
  valeur_indice_reference NUMERIC,
  date_derniere_indexation DATE,
  -- Garantie
  montant_garantie NUMERIC,
  type_garantie TEXT,
  date_versement_garantie DATE,
  -- Clauses
  clauses_particulieres TEXT,
  -- Document
  document_url TEXT,
  date_signature DATE,
  lieu_signature TEXT,
  -- Statut
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'resilie', 'expire', 'a_signer', 'a_renouveler')),
  motif_resiliation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.7 Table transactions_comptables (Comptabilité)
CREATE TABLE public.transactions_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  locataire_id UUID REFERENCES locataires_immeuble(id) ON DELETE SET NULL,
  -- Catégorisation
  categorie TEXT NOT NULL CHECK (categorie IN ('recette', 'charge_courante', 'charge_entretien', 'charge_financiere', 'investissement')),
  sous_categorie TEXT,
  -- Transaction
  date_transaction DATE NOT NULL,
  date_echeance DATE,
  libelle TEXT NOT NULL,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  -- Fournisseur/Tiers
  tiers_nom TEXT,
  tiers_reference TEXT,
  numero_facture TEXT,
  numero_piece TEXT,
  -- Récurrence
  est_recurrente BOOLEAN DEFAULT false,
  periodicite TEXT CHECK (periodicite IN ('mensuel', 'trimestriel', 'semestriel', 'annuel')),
  -- Statut
  statut TEXT DEFAULT 'comptabilise' CHECK (statut IN ('en_attente', 'comptabilise', 'paye', 'annule')),
  date_paiement DATE,
  mode_paiement TEXT,
  -- Pièce jointe
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.8 Table hypotheques
CREATE TABLE public.hypotheques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  numero TEXT,
  rang INTEGER DEFAULT 1,
  creancier TEXT NOT NULL,
  numero_pret TEXT,
  -- Montants
  montant_initial NUMERIC NOT NULL,
  montant_actuel NUMERIC,
  -- Taux
  taux_interet NUMERIC,
  type_taux TEXT CHECK (type_taux IN ('fixe', 'variable', 'saron')),
  marge_saron NUMERIC,
  -- Dates
  date_debut DATE,
  date_fin DATE,
  date_prochaine_echeance DATE,
  -- Amortissement
  type_amortissement TEXT CHECK (type_amortissement IN ('direct', 'indirect', 'aucun')),
  montant_amortissement NUMERIC,
  periodicite_amortissement TEXT CHECK (periodicite_amortissement IN ('mensuel', 'trimestriel', 'semestriel', 'annuel')),
  compte_3a TEXT,
  -- Documents
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.9 Table assurances_immeuble
CREATE TABLE public.assurances_immeuble (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  assureur TEXT NOT NULL,
  numero_police TEXT,
  type_assurance TEXT CHECK (type_assurance IN ('batiment', 'rc', 'protection_juridique', 'perte_loyer', 'combinee', 'autre')),
  -- Dates
  date_debut DATE,
  date_fin DATE,
  date_prochaine_echeance DATE,
  mois_resiliation INTEGER,
  delai_resiliation_mois INTEGER DEFAULT 3,
  -- Primes
  prime_annuelle NUMERIC,
  periodicite_paiement TEXT DEFAULT 'annuel',
  -- Couverture
  valeur_assuree NUMERIC,
  franchise NUMERIC,
  risques_couverts JSONB DEFAULT '[]'::jsonb,
  -- Documents
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.10 Table tickets_techniques
CREATE TABLE public.tickets_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  locataire_id UUID REFERENCES locataires_immeuble(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  -- Ticket
  numero_ticket TEXT,
  titre TEXT NOT NULL,
  description TEXT,
  priorite TEXT DEFAULT 'normale' CHECK (priorite IN ('urgente', 'haute', 'normale', 'basse')),
  categorie TEXT CHECK (categorie IN ('plomberie', 'electricite', 'chauffage', 'serrurerie', 'menuiserie', 'peinture', 'facade', 'toiture', 'ascenseur', 'espaces_verts', 'nettoyage', 'autre')),
  -- Statut
  statut TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'en_attente_devis', 'devis_accepte', 'travaux_planifies', 'en_travaux', 'a_verifier', 'resolu', 'clos', 'annule')),
  date_resolution TIMESTAMPTZ,
  -- Intervention
  fournisseur_id UUID,
  fournisseur_nom TEXT,
  date_intervention_prevue TIMESTAMPTZ,
  date_intervention_reelle TIMESTAMPTZ,
  -- Financier
  montant_devis NUMERIC,
  montant_facture NUMERIC,
  facture_url TEXT,
  -- Photos
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  cree_par UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.11 Table documents_immeuble
CREATE TABLE public.documents_immeuble (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  locataire_id UUID REFERENCES locataires_immeuble(id) ON DELETE SET NULL,
  -- Document
  nom TEXT NOT NULL,
  type_document TEXT NOT NULL CHECK (type_document IN ('bail', 'contrat', 'registre_foncier', 'plan', 'hypotheque', 'assurance', 'decompte_charges', 'facture', 'rapport_technique', 'pv_assemblee', 'correspondance', 'photo', 'autre')),
  url TEXT NOT NULL,
  taille INTEGER,
  mime_type TEXT,
  -- Métadonnées
  date_document DATE,
  annee INTEGER,
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  -- Accès
  est_confidentiel BOOLEAN DEFAULT false,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.12 Table candidatures_location
CREATE TABLE public.candidatures_location (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  -- Candidat principal
  civilite TEXT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  date_naissance DATE,
  nationalite TEXT,
  type_permis TEXT,
  -- Situation professionnelle
  profession TEXT,
  employeur TEXT,
  date_engagement DATE,
  type_contrat TEXT,
  revenus_mensuels NUMERIC,
  -- Situation actuelle
  adresse_actuelle TEXT,
  loyer_actuel NUMERIC,
  motif_changement TEXT,
  -- Co-locataires
  co_candidats JSONB DEFAULT '[]'::jsonb,
  nombre_occupants INTEGER DEFAULT 1,
  -- Documents
  documents JSONB DEFAULT '[]'::jsonb,
  -- Dates souhaitées
  date_emmenagement_souhaitee DATE,
  -- Évaluation
  score_dossier INTEGER,
  note_agent TEXT,
  -- Statut
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_analyse', 'documents_demandes', 'visite_planifiee', 'visite_effectuee', 'accepte', 'refuse', 'desiste')),
  date_visite TIMESTAMPTZ,
  motif_refus TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES pour les performances
-- =====================================================

CREATE INDEX idx_proprietaires_user_id ON proprietaires(user_id);
CREATE INDEX idx_proprietaires_agent_id ON proprietaires(agent_id);
CREATE INDEX idx_immeubles_proprietaire_id ON immeubles(proprietaire_id);
CREATE INDEX idx_immeubles_statut ON immeubles(statut);
CREATE INDEX idx_lots_immeuble_id ON lots(immeuble_id);
CREATE INDEX idx_lots_statut ON lots(statut);
CREATE INDEX idx_locataires_lot_id ON locataires_immeuble(lot_id);
CREATE INDEX idx_locataires_statut ON locataires_immeuble(statut);
CREATE INDEX idx_baux_lot_id ON baux(lot_id);
CREATE INDEX idx_baux_locataire_id ON baux(locataire_id);
CREATE INDEX idx_baux_statut ON baux(statut);
CREATE INDEX idx_transactions_immeuble_id ON transactions_comptables(immeuble_id);
CREATE INDEX idx_transactions_date ON transactions_comptables(date_transaction);
CREATE INDEX idx_transactions_categorie ON transactions_comptables(categorie);
CREATE INDEX idx_hypotheques_immeuble_id ON hypotheques(immeuble_id);
CREATE INDEX idx_assurances_immeuble_id ON assurances_immeuble(immeuble_id);
CREATE INDEX idx_tickets_immeuble_id ON tickets_techniques(immeuble_id);
CREATE INDEX idx_tickets_statut ON tickets_techniques(statut);
CREATE INDEX idx_tickets_priorite ON tickets_techniques(priorite);
CREATE INDEX idx_tickets_agent_id ON tickets_techniques(agent_id);
CREATE INDEX idx_documents_immeuble_id ON documents_immeuble(immeuble_id);
CREATE INDEX idx_candidatures_lot_id ON candidatures_location(lot_id);
CREATE INDEX idx_candidatures_statut ON candidatures_location(statut);

-- =====================================================
-- TRIGGERS pour updated_at
-- =====================================================

CREATE TRIGGER update_proprietaires_updated_at BEFORE UPDATE ON proprietaires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_immeubles_updated_at BEFORE UPDATE ON immeubles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locataires_immeuble_updated_at BEFORE UPDATE ON locataires_immeuble FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_baux_updated_at BEFORE UPDATE ON baux FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_comptables_updated_at BEFORE UPDATE ON transactions_comptables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hypotheques_updated_at BEFORE UPDATE ON hypotheques FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assurances_immeuble_updated_at BEFORE UPDATE ON assurances_immeuble FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_techniques_updated_at BEFORE UPDATE ON tickets_techniques FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_immeuble_updated_at BEFORE UPDATE ON documents_immeuble FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidatures_location_updated_at BEFORE UPDATE ON candidatures_location FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENABLE RLS sur toutes les tables
-- =====================================================

ALTER TABLE proprietaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE immeubles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE locataires_immeuble ENABLE ROW LEVEL SECURITY;
ALTER TABLE baux ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_comptables ENABLE ROW LEVEL SECURITY;
ALTER TABLE hypotheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE assurances_immeuble ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_immeuble ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatures_location ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FONCTIONS HELPER pour RLS
-- =====================================================

-- Vérifie si l'utilisateur est le propriétaire
CREATE OR REPLACE FUNCTION public.is_proprietaire_owner(_proprietaire_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM proprietaires
    WHERE id = _proprietaire_id
    AND user_id = auth.uid()
  );
$$;

-- Vérifie si l'agent est assigné au propriétaire
CREATE OR REPLACE FUNCTION public.is_agent_of_proprietaire(_proprietaire_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM proprietaires p
    JOIN agents a ON a.id = p.agent_id
    WHERE p.id = _proprietaire_id
    AND a.user_id = auth.uid()
  );
$$;

-- Vérifie si l'utilisateur a accès à l'immeuble (propriétaire ou agent)
CREATE OR REPLACE FUNCTION public.has_access_to_immeuble(_immeuble_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM immeubles i
    JOIN proprietaires p ON p.id = i.proprietaire_id
    LEFT JOIN agents a ON a.id = p.agent_id
    WHERE i.id = _immeuble_id
    AND (p.user_id = auth.uid() OR a.user_id = auth.uid())
  );
$$;

-- =====================================================
-- RLS POLICIES - PROPRIETAIRES
-- =====================================================

CREATE POLICY "Admins can manage all proprietaires"
ON proprietaires FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Proprietaires can view own data"
ON proprietaires FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Proprietaires can update own data"
ON proprietaires FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Agents can view their assigned proprietaires"
ON proprietaires FOR SELECT
USING (EXISTS (
  SELECT 1 FROM agents a
  WHERE a.id = proprietaires.agent_id
  AND a.user_id = auth.uid()
));

CREATE POLICY "System can insert proprietaires"
ON proprietaires FOR INSERT
WITH CHECK (true);

-- =====================================================
-- RLS POLICIES - IMMEUBLES
-- =====================================================

CREATE POLICY "Admins can manage all immeubles"
ON immeubles FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Proprietaires can manage their own immeubles"
ON immeubles FOR ALL
USING (is_proprietaire_owner(proprietaire_id));

CREATE POLICY "Agents can view and manage assigned proprietaires immeubles"
ON immeubles FOR ALL
USING (is_agent_of_proprietaire(proprietaire_id));

-- =====================================================
-- RLS POLICIES - LOTS
-- =====================================================

CREATE POLICY "Admins can manage all lots"
ON lots FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with immeuble access can manage lots"
ON lots FOR ALL
USING (has_access_to_immeuble(immeuble_id));

-- =====================================================
-- RLS POLICIES - LOCATAIRES_IMMEUBLE
-- =====================================================

CREATE POLICY "Admins can manage all locataires"
ON locataires_immeuble FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with lot access can manage locataires"
ON locataires_immeuble FOR ALL
USING (EXISTS (
  SELECT 1 FROM lots l
  WHERE l.id = locataires_immeuble.lot_id
  AND has_access_to_immeuble(l.immeuble_id)
));

-- =====================================================
-- RLS POLICIES - BAUX
-- =====================================================

CREATE POLICY "Admins can manage all baux"
ON baux FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with lot access can manage baux"
ON baux FOR ALL
USING (EXISTS (
  SELECT 1 FROM lots l
  WHERE l.id = baux.lot_id
  AND has_access_to_immeuble(l.immeuble_id)
));

-- =====================================================
-- RLS POLICIES - TRANSACTIONS_COMPTABLES
-- =====================================================

CREATE POLICY "Admins can manage all transactions"
ON transactions_comptables FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with immeuble access can manage transactions"
ON transactions_comptables FOR ALL
USING (has_access_to_immeuble(immeuble_id));

-- =====================================================
-- RLS POLICIES - HYPOTHEQUES
-- =====================================================

CREATE POLICY "Admins can manage all hypotheques"
ON hypotheques FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with immeuble access can manage hypotheques"
ON hypotheques FOR ALL
USING (has_access_to_immeuble(immeuble_id));

-- =====================================================
-- RLS POLICIES - ASSURANCES_IMMEUBLE
-- =====================================================

CREATE POLICY "Admins can manage all assurances"
ON assurances_immeuble FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with immeuble access can manage assurances"
ON assurances_immeuble FOR ALL
USING (has_access_to_immeuble(immeuble_id));

-- =====================================================
-- RLS POLICIES - TICKETS_TECHNIQUES
-- =====================================================

CREATE POLICY "Admins can manage all tickets"
ON tickets_techniques FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with immeuble access can manage tickets"
ON tickets_techniques FOR ALL
USING (has_access_to_immeuble(immeuble_id));

CREATE POLICY "Assigned agents can manage their tickets"
ON tickets_techniques FOR ALL
USING (EXISTS (
  SELECT 1 FROM agents a
  WHERE a.id = tickets_techniques.agent_id
  AND a.user_id = auth.uid()
));

-- =====================================================
-- RLS POLICIES - DOCUMENTS_IMMEUBLE
-- =====================================================

CREATE POLICY "Admins can manage all documents"
ON documents_immeuble FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with immeuble access can manage documents"
ON documents_immeuble FOR ALL
USING (
  immeuble_id IS NOT NULL AND has_access_to_immeuble(immeuble_id)
);

CREATE POLICY "Users with lot access can manage lot documents"
ON documents_immeuble FOR ALL
USING (
  lot_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM lots l
    WHERE l.id = documents_immeuble.lot_id
    AND has_access_to_immeuble(l.immeuble_id)
  )
);

-- =====================================================
-- RLS POLICIES - CANDIDATURES_LOCATION
-- =====================================================

CREATE POLICY "Admins can manage all candidatures"
ON candidatures_location FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users with lot access can manage candidatures"
ON candidatures_location FOR ALL
USING (EXISTS (
  SELECT 1 FROM lots l
  WHERE l.id = candidatures_location.lot_id
  AND has_access_to_immeuble(l.immeuble_id)
));