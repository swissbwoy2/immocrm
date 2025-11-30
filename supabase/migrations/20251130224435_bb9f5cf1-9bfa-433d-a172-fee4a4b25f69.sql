-- Table pour les demandes de mandat
CREATE TABLE public.demandes_mandat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informations personnelles
  email TEXT NOT NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  adresse TEXT NOT NULL,
  date_naissance DATE NOT NULL,
  nationalite TEXT NOT NULL,
  type_permis TEXT NOT NULL,
  etat_civil TEXT NOT NULL,
  
  -- Situation actuelle
  gerance_actuelle TEXT NOT NULL,
  contact_gerance TEXT NOT NULL,
  loyer_actuel NUMERIC NOT NULL DEFAULT 0,
  depuis_le DATE NOT NULL,
  pieces_actuel NUMERIC NOT NULL DEFAULT 1,
  
  -- Finances
  charges_extraordinaires BOOLEAN DEFAULT false,
  montant_charges_extra NUMERIC DEFAULT 0,
  poursuites BOOLEAN DEFAULT false,
  curatelle BOOLEAN DEFAULT false,
  motif_changement TEXT NOT NULL,
  profession TEXT NOT NULL,
  employeur TEXT NOT NULL,
  revenus_mensuels NUMERIC NOT NULL DEFAULT 0,
  date_engagement DATE,
  utilisation_logement TEXT DEFAULT 'Principal',
  
  -- Autres infos
  animaux BOOLEAN DEFAULT false,
  instrument_musique BOOLEAN DEFAULT false,
  vehicules BOOLEAN DEFAULT false,
  numero_plaques TEXT,
  decouverte_agence TEXT NOT NULL,
  
  -- Critères de recherche
  type_recherche TEXT NOT NULL DEFAULT 'Louer',
  nombre_occupants INTEGER NOT NULL DEFAULT 1,
  type_bien TEXT NOT NULL,
  pieces_recherche TEXT NOT NULL,
  region_recherche TEXT NOT NULL,
  budget_max NUMERIC NOT NULL DEFAULT 0,
  souhaits_particuliers TEXT,
  
  -- Candidats supplémentaires (JSON array)
  candidats JSONB DEFAULT '[]'::jsonb,
  
  -- Documents uploadés (JSON array avec {name, url, type})
  documents_uploades JSONB DEFAULT '[]'::jsonb,
  
  -- Signature et CGV
  signature_data TEXT,
  cgv_acceptees BOOLEAN NOT NULL DEFAULT false,
  cgv_acceptees_at TIMESTAMPTZ,
  
  -- Code promo
  code_promo TEXT,
  
  -- Suivi administratif
  statut TEXT DEFAULT 'en_attente',
  abaninja_invoice_id TEXT,
  abaninja_invoice_ref TEXT,
  montant_acompte NUMERIC DEFAULT 300,
  date_paiement TIMESTAMPTZ,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  notes_admin TEXT,
  
  -- User créé après activation
  user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.demandes_mandat ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all demandes" ON public.demandes_mandat
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert demande" ON public.demandes_mandat
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own demande" ON public.demandes_mandat
  FOR SELECT USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Index for faster lookups
CREATE INDEX idx_demandes_mandat_email ON public.demandes_mandat(email);
CREATE INDEX idx_demandes_mandat_statut ON public.demandes_mandat(statut);

-- Trigger for updated_at
CREATE TRIGGER update_demandes_mandat_updated_at
  BEFORE UPDATE ON public.demandes_mandat
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();