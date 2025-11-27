-- Ajouter les foreign keys manquantes sur la table transactions
-- pour que les jointures Supabase fonctionnent correctement

-- Foreign key vers clients
ALTER TABLE public.transactions 
ADD CONSTRAINT fk_transactions_client 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Foreign key vers agents  
ALTER TABLE public.transactions 
ADD CONSTRAINT fk_transactions_agent 
FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- Foreign key vers offres
ALTER TABLE public.transactions 
ADD CONSTRAINT fk_transactions_offre 
FOREIGN KEY (offre_id) REFERENCES public.offres(id) ON DELETE SET NULL;