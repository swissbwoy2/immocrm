-- Table pour stocker les candidats supplémentaires (garant, colocataire, co-débiteur, signataire solidaire)
CREATE TABLE public.client_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Type de candidat
  type TEXT NOT NULL CHECK (type IN ('garant', 'colocataire', 'co_debiteur', 'signataire_solidaire')),
  
  -- Informations personnelles (identiques au client)
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  date_naissance DATE,
  adresse TEXT,
  nationalite TEXT,
  type_permis TEXT,
  situation_familiale TEXT,
  
  -- Situation actuelle (logement)
  gerance_actuelle TEXT,
  contact_gerance TEXT,
  loyer_actuel NUMERIC DEFAULT 0,
  depuis_le DATE,
  pieces_actuel NUMERIC DEFAULT 0,
  motif_changement TEXT,
  
  -- Situation professionnelle
  profession TEXT,
  employeur TEXT,
  secteur_activite TEXT,
  type_contrat TEXT,
  source_revenus TEXT,
  anciennete_mois INTEGER,
  date_engagement DATE,
  
  -- Situation financière
  revenus_mensuels NUMERIC DEFAULT 0,
  charges_mensuelles NUMERIC DEFAULT 0,
  charges_extraordinaires BOOLEAN DEFAULT false,
  montant_charges_extra NUMERIC DEFAULT 0,
  autres_credits BOOLEAN DEFAULT false,
  apport_personnel NUMERIC DEFAULT 0,
  poursuites BOOLEAN DEFAULT false,
  curatelle BOOLEAN DEFAULT false,
  
  -- Relation au client principal
  lien_avec_client TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_client_candidates_client_id ON public.client_candidates(client_id);

-- Trigger pour updated_at
CREATE TRIGGER update_client_candidates_updated_at
BEFORE UPDATE ON public.client_candidates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS
ALTER TABLE public.client_candidates ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout gérer
CREATE POLICY "Admins can manage all candidates" ON public.client_candidates
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents peuvent gérer les candidats de leurs clients
CREATE POLICY "Agents can manage candidates of their clients" ON public.client_candidates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = client_candidates.client_id AND a.user_id = auth.uid()
  )
);

-- Clients peuvent gérer leurs propres candidats
CREATE POLICY "Clients can manage their own candidates" ON public.client_candidates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM clients WHERE id = client_candidates.client_id AND user_id = auth.uid()
  )
);

-- Ajouter la colonne candidate_id à la table documents
ALTER TABLE public.documents 
ADD COLUMN candidate_id UUID REFERENCES public.client_candidates(id) ON DELETE CASCADE;

-- Index pour les requêtes
CREATE INDEX idx_documents_candidate_id ON public.documents(candidate_id);

-- Agents peuvent gérer les documents des candidats de leurs clients
CREATE POLICY "Agents can manage candidate documents" ON public.documents
FOR ALL USING (
  candidate_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM client_candidates cc
    JOIN clients c ON c.id = cc.client_id
    JOIN agents a ON a.id = c.agent_id
    WHERE cc.id = documents.candidate_id AND a.user_id = auth.uid()
  )
);

-- Clients peuvent gérer les documents de leurs candidats
CREATE POLICY "Clients can manage their candidate documents" ON public.documents
FOR ALL USING (
  candidate_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM client_candidates cc
    JOIN clients c ON c.id = cc.client_id
    WHERE cc.id = documents.candidate_id AND c.user_id = auth.uid()
  )
);