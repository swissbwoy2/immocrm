-- Add foreign key constraint from clients.user_id to profiles.id
ALTER TABLE public.clients
ADD CONSTRAINT fk_clients_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from clients.agent_id to agents.id
ALTER TABLE public.clients
ADD CONSTRAINT fk_clients_agent_id 
FOREIGN KEY (agent_id) 
REFERENCES public.agents(id) 
ON DELETE SET NULL;