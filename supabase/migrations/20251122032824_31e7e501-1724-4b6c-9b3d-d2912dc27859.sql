-- Créer la table pour l'historique des renouvellements de mandat
CREATE TABLE public.renouvellements_mandat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  date_ancien_mandat timestamp with time zone NOT NULL,
  date_nouveau_mandat timestamp with time zone NOT NULL DEFAULT now(),
  raison text,
  created_at timestamp with time zone DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.renouvellements_mandat ENABLE ROW LEVEL SECURITY;

-- Politique pour que les clients voient leurs renouvellements
CREATE POLICY "Clients can view their renewals"
ON public.renouvellements_mandat FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = renouvellements_mandat.client_id 
  AND clients.user_id = auth.uid()
));

-- Politique pour que les agents voient les renouvellements de leurs clients
CREATE POLICY "Agents can view their clients renewals"
ON public.renouvellements_mandat FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.agents 
  WHERE agents.id = renouvellements_mandat.agent_id 
  AND agents.user_id = auth.uid()
));

-- Politique pour que les admins voient tous les renouvellements
CREATE POLICY "Admins can view all renewals"
ON public.renouvellements_mandat FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour que les clients puissent insérer leurs renouvellements
CREATE POLICY "Clients can insert their renewals"
ON public.renouvellements_mandat FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = renouvellements_mandat.client_id 
  AND clients.user_id = auth.uid()
));