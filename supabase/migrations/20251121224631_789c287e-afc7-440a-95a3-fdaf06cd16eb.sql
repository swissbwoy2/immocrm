-- Create offres table
CREATE TABLE public.offres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT,
  adresse TEXT NOT NULL,
  prix NUMERIC NOT NULL,
  pieces INTEGER,
  surface NUMERIC,
  type_bien TEXT,
  description TEXT,
  lien_annonce TEXT,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  statut TEXT DEFAULT 'envoyee',
  date_envoi TIMESTAMP WITH TIME ZONE DEFAULT now(),
  etage TEXT,
  disponibilite TEXT,
  code_immeuble TEXT,
  locataire_nom TEXT,
  locataire_tel TEXT,
  concierge_nom TEXT,
  concierge_tel TEXT,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create visites table
CREATE TABLE public.visites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id UUID REFERENCES public.offres(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  date_visite TIMESTAMP WITH TIME ZONE NOT NULL,
  adresse TEXT NOT NULL,
  statut TEXT DEFAULT 'planifiee',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  offre_id UUID REFERENCES public.offres(id) ON DELETE SET NULL,
  montant_total NUMERIC NOT NULL,
  commission_totale NUMERIC NOT NULL,
  part_agence NUMERIC NOT NULL,
  part_agent NUMERIC NOT NULL,
  statut TEXT DEFAULT 'en cours',
  date_transaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  taille INTEGER,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  url TEXT,
  statut TEXT DEFAULT 'en attente',
  date_upload TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offres
CREATE POLICY "Admins can view all offres"
  ON public.offres FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view their offres"
  ON public.offres FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.user_id = auth.uid() 
    AND agents.id = offres.agent_id
  ));

CREATE POLICY "Clients can view their offres"
  ON public.offres FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.user_id = auth.uid() 
    AND clients.id = offres.client_id
  ));

CREATE POLICY "Agents can insert their offres"
  ON public.offres FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.user_id = auth.uid() 
    AND agents.id = offres.agent_id
  ));

CREATE POLICY "Agents can update their offres"
  ON public.offres FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.user_id = auth.uid() 
    AND agents.id = offres.agent_id
  ));

CREATE POLICY "Clients can update their offres statut"
  ON public.offres FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.user_id = auth.uid() 
    AND clients.id = offres.client_id
  ));

-- RLS Policies for visites
CREATE POLICY "Admins can manage all visites"
  ON public.visites FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view their visites"
  ON public.visites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.user_id = auth.uid() 
    AND agents.id = visites.agent_id
  ));

CREATE POLICY "Clients can view their visites"
  ON public.visites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.user_id = auth.uid() 
    AND clients.id = visites.client_id
  ));

CREATE POLICY "Agents can insert visites"
  ON public.visites FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.user_id = auth.uid() 
    AND agents.id = visites.agent_id
  ));

CREATE POLICY "Agents can update their visites"
  ON public.visites FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.user_id = auth.uid() 
    AND agents.id = visites.agent_id
  ));

-- RLS Policies for transactions
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view their transactions"
  ON public.transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.user_id = auth.uid() 
    AND agents.id = transactions.agent_id
  ));

CREATE POLICY "Admins can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for documents
CREATE POLICY "Admins can view all documents"
  ON public.documents FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their documents"
  ON public.documents FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their documents"
  ON public.documents FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Add triggers for updated_at
CREATE TRIGGER update_offres_updated_at
  BEFORE UPDATE ON public.offres
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visites_updated_at
  BEFORE UPDATE ON public.visites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();