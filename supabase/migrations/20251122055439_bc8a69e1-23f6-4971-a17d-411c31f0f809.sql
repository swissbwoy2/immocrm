-- Corriger les clés étrangères pour qu'elles pointent vers profiles au lieu de auth.users

-- 1. Supprimer et recréer agents.user_id -> profiles.id
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_user_id_fkey;
ALTER TABLE public.agents
ADD CONSTRAINT agents_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 2. Supprimer et recréer clients.user_id -> profiles.id
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;
ALTER TABLE public.clients
ADD CONSTRAINT clients_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 3. Ajouter clients.agent_id -> agents.id si elle n'existe pas
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_agent_id_fkey;
ALTER TABLE public.clients
ADD CONSTRAINT clients_agent_id_fkey 
FOREIGN KEY (agent_id) 
REFERENCES public.agents(id) 
ON DELETE SET NULL;

-- 4. Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON public.clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_offres_client_id ON public.offres(client_id);
CREATE INDEX IF NOT EXISTS idx_offres_agent_id ON public.offres(agent_id);
CREATE INDEX IF NOT EXISTS idx_visites_client_id ON public.visites(client_id);
CREATE INDEX IF NOT EXISTS idx_visites_agent_id ON public.visites(agent_id);