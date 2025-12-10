-- Types de contacts enum
CREATE TYPE public.contact_type AS ENUM (
  'proprietaire',
  'gerant_regie',
  'concierge',
  'locataire',
  'client_potentiel',
  'regie',
  'notaire',
  'autre'
);

-- Table contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  contact_type contact_type NOT NULL,
  
  -- Informations personnelles
  civilite TEXT,
  prenom TEXT,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  telephone_secondaire TEXT,
  
  -- Adresse
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  
  -- Informations professionnelles
  entreprise TEXT,
  fonction TEXT,
  
  -- Notes et suivi
  notes TEXT,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_contacts_agent_id ON public.contacts(agent_id);
CREATE INDEX idx_contacts_contact_type ON public.contacts(contact_type);
CREATE INDEX idx_contacts_nom ON public.contacts(nom);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage all contacts
CREATE POLICY "Admins can manage all contacts"
ON public.contacts FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policy: Agents can manage their own contacts
CREATE POLICY "Agents can manage their own contacts"
ON public.contacts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = contacts.agent_id
    AND agents.user_id = auth.uid()
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();