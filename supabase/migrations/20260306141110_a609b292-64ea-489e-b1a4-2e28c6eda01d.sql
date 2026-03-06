
-- Employees table for payroll
CREATE TABLE public.employes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  date_naissance DATE,
  nationalite TEXT DEFAULT 'Suisse',
  type_permis TEXT, -- B, C, F, G, Suisse
  etat_civil TEXT,
  nombre_enfants INTEGER DEFAULT 0,
  avs_number TEXT, -- numéro AVS
  iban TEXT,
  banque TEXT,
  date_engagement DATE,
  date_fin DATE,
  taux_activite NUMERIC DEFAULT 100, -- pourcentage
  salaire_mensuel NUMERIC DEFAULT 0,
  salaire_horaire NUMERIC,
  type_contrat TEXT DEFAULT 'fixe', -- fixe, horaire, independant
  poste TEXT,
  canton_travail TEXT DEFAULT 'VD',
  canton_domicile TEXT DEFAULT 'VD',
  bareme_impot_source TEXT, -- A0, B1, C2 etc.
  is_independant BOOLEAN DEFAULT false,
  statut TEXT DEFAULT 'actif', -- actif, inactif, termine
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Salary slips
CREATE TABLE public.fiches_salaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id UUID REFERENCES public.employes(id) ON DELETE CASCADE NOT NULL,
  mois INTEGER NOT NULL, -- 1-12
  annee INTEGER NOT NULL,
  -- Brut
  salaire_base NUMERIC DEFAULT 0,
  absences_payees NUMERIC DEFAULT 0,
  heures_supplementaires NUMERIC DEFAULT 0,
  primes NUMERIC DEFAULT 0,
  salaire_brut NUMERIC DEFAULT 0,
  -- Déductions employé
  taux_avs NUMERIC DEFAULT 5.3,
  montant_avs NUMERIC DEFAULT 0,
  taux_ac NUMERIC DEFAULT 1.1,
  montant_ac NUMERIC DEFAULT 0,
  taux_aanp NUMERIC DEFAULT 1.2,
  montant_aanp NUMERIC DEFAULT 0,
  taux_ijm NUMERIC DEFAULT 0.8,
  montant_ijm NUMERIC DEFAULT 0,
  taux_lpcfam NUMERIC DEFAULT 0.06,
  montant_lpcfam NUMERIC DEFAULT 0,
  montant_lpp NUMERIC DEFAULT 0,
  taux_impot_source NUMERIC DEFAULT 0,
  montant_impot_source NUMERIC DEFAULT 0,
  autres_deductions NUMERIC DEFAULT 0,
  detail_autres_deductions TEXT,
  total_deductions NUMERIC DEFAULT 0,
  -- Net
  salaire_net NUMERIC DEFAULT 0,
  -- Charges employeur
  taux_avs_employeur NUMERIC DEFAULT 5.3,
  montant_avs_employeur NUMERIC DEFAULT 0,
  taux_ac_employeur NUMERIC DEFAULT 1.1,
  montant_ac_employeur NUMERIC DEFAULT 0,
  taux_aap NUMERIC DEFAULT 0.5,
  montant_aap NUMERIC DEFAULT 0,
  taux_lpcfam_employeur NUMERIC DEFAULT 0.06,
  montant_lpcfam_employeur NUMERIC DEFAULT 0,
  montant_lpp_employeur NUMERIC DEFAULT 0,
  taux_af NUMERIC DEFAULT 2.0,
  montant_af NUMERIC DEFAULT 0,
  total_charges_employeur NUMERIC DEFAULT 0,
  cout_total_employeur NUMERIC DEFAULT 0,
  -- Metadata
  statut TEXT DEFAULT 'brouillon', -- brouillon, valide, paye
  date_paiement DATE,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(employe_id, mois, annee)
);

-- RLS
ALTER TABLE public.employes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches_salaire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage employes" ON public.employes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage fiches_salaire" ON public.fiches_salaire
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
