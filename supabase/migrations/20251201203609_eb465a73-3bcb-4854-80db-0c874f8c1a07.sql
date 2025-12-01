-- Phase 1: Créer les nouvelles tables pour multi-agents

-- Table client_agents : relation many-to-many entre clients et agents
CREATE TABLE IF NOT EXISTS public.client_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  commission_split NUMERIC DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, agent_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_client_agents_client ON public.client_agents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_agents_agent ON public.client_agents(agent_id);

-- Contrainte : un seul agent principal par client
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_agents_primary ON public.client_agents(client_id) WHERE is_primary = true;

-- Table conversation_agents : agents participants dans une conversation
CREATE TABLE IF NOT EXISTS public.conversation_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_agents_conv ON public.conversation_agents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_agent ON public.conversation_agents(agent_id);

-- Migrer les données existantes vers client_agents
INSERT INTO public.client_agents (client_id, agent_id, is_primary, commission_split)
SELECT id, agent_id, true, COALESCE(commission_split, 50)
FROM public.clients
WHERE agent_id IS NOT NULL
ON CONFLICT (client_id, agent_id) DO NOTHING;

-- Créer les entrées conversation_agents pour les conversations existantes
INSERT INTO public.conversation_agents (conversation_id, agent_id)
SELECT c.id, c.agent_id::uuid
FROM public.conversations c
WHERE c.agent_id IS NOT NULL AND c.agent_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (conversation_id, agent_id) DO NOTHING;

-- Fonction helper pour vérifier si un agent est assigné à un client via client_agents
CREATE OR REPLACE FUNCTION public.is_agent_of_client_via_junction(_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = _client_id
    AND a.user_id = auth.uid()
  );
$$;

-- Enable RLS sur les nouvelles tables
ALTER TABLE public.client_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_agents ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour client_agents
CREATE POLICY "Admins can manage all client_agents"
ON public.client_agents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view their own client assignments"
ON public.client_agents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = client_agents.agent_id
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Agents can view co-agents of their clients"
ON public.client_agents
FOR SELECT
USING (
  client_id IN (
    SELECT ca.client_id FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their assigned agents"
ON public.client_agents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_agents.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Politiques RLS pour conversation_agents
CREATE POLICY "Admins can manage all conversation_agents"
ON public.conversation_agents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view their conversation participations"
ON public.conversation_agents
FOR SELECT
USING (
  agent_id::text IN (
    SELECT a.id::text FROM public.agents a
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert conversation_agents"
ON public.conversation_agents
FOR INSERT
WITH CHECK (true);

-- Mettre à jour les politiques existantes pour utiliser le système multi-agents

-- Candidatures : les agents peuvent gérer les candidatures de tous leurs clients assignés
DROP POLICY IF EXISTS "Agents peuvent voir candidatures de leurs clients" ON public.candidatures;
DROP POLICY IF EXISTS "Agents peuvent créer candidatures pour leurs clients" ON public.candidatures;
DROP POLICY IF EXISTS "Agents peuvent modifier candidatures de leurs clients" ON public.candidatures;

CREATE POLICY "Agents multi peuvent gérer candidatures"
ON public.candidatures
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = candidatures.client_id
    AND a.user_id = auth.uid()
  )
);

-- Offres : les agents peuvent voir toutes les offres de leurs clients et en créer
DROP POLICY IF EXISTS "Agents can view their offres" ON public.offres;
DROP POLICY IF EXISTS "Agents can insert their offres" ON public.offres;
DROP POLICY IF EXISTS "Agents can update their offres" ON public.offres;

CREATE POLICY "Agents multi peuvent voir offres de leurs clients"
ON public.offres
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = offres.client_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Agents multi peuvent créer offres"
ON public.offres
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = offres.agent_id
    AND agents.user_id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = offres.client_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Agents multi peuvent modifier offres de leurs clients"
ON public.offres
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = offres.client_id
    AND a.user_id = auth.uid()
  )
);

-- Visites : les agents peuvent gérer les visites de tous leurs clients
DROP POLICY IF EXISTS "Agents peuvent voir candidatures de leurs clients" ON public.visites;
DROP POLICY IF EXISTS "Agents peuvent créer visites pour leurs clients" ON public.visites;
DROP POLICY IF EXISTS "Agents peuvent modifier visites de leurs clients" ON public.visites;

CREATE POLICY "Agents multi peuvent gérer visites"
ON public.visites
FOR ALL
USING (
  agent_id IN (
    SELECT a.id FROM public.agents a
    WHERE a.user_id = auth.uid()
  ) OR
  client_id IN (
    SELECT ca.client_id FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE a.user_id = auth.uid()
  )
);

-- Messages : utiliser conversation_agents pour l'accès
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;

CREATE POLICY "Users multi can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  conversation_id IN (
    SELECT ca.conversation_id FROM public.conversation_agents ca
    WHERE ca.agent_id::text IN (
      SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid()
    )
  ) OR
  conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE c.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id::text = c.client_id
      AND cl.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users multi can insert messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  conversation_id IN (
    SELECT ca.conversation_id FROM public.conversation_agents ca
    WHERE ca.agent_id::text IN (
      SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid()
    )
  ) OR
  conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE c.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id::text = c.client_id
      AND cl.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users multi can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  conversation_id IN (
    SELECT ca.conversation_id FROM public.conversation_agents ca
    WHERE ca.agent_id::text IN (
      SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid()
    )
  ) OR
  conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE c.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id::text = c.client_id
      AND cl.user_id = auth.uid()
    )
  )
);

-- Conversations : utiliser conversation_agents pour l'accès
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "Users multi can view their conversations"
ON public.conversations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  id IN (
    SELECT ca.conversation_id FROM public.conversation_agents ca
    WHERE ca.agent_id::text IN (
      SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid()
    )
  ) OR
  (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id::text = conversations.client_id
    AND clients.user_id = auth.uid()
  ))
);

CREATE POLICY "Users multi can update their conversations"
ON public.conversations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  id IN (
    SELECT ca.conversation_id FROM public.conversation_agents ca
    WHERE ca.agent_id::text IN (
      SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid()
    )
  ) OR
  (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id::text = conversations.client_id
    AND clients.user_id = auth.uid()
  ))
);

-- Mettre à jour le trigger de notification pour supporter multi-agents
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_sender_name TEXT;
  v_recipient_user_id UUID;
  v_admin_record RECORD;
  v_agent_record RECORD;
BEGIN
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;
  
  IF v_conversation IS NOT NULL THEN
    SELECT COALESCE(prenom || ' ' || nom, email) INTO v_sender_name
    FROM profiles WHERE id = NEW.sender_id::uuid;
    
    IF NEW.sender_type = 'agent' THEN
      -- Notifier le client
      IF v_conversation.client_id IS NOT NULL THEN
        SELECT user_id INTO v_recipient_user_id 
        FROM clients WHERE id = v_conversation.client_id::uuid;
        
        IF v_recipient_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_recipient_user_id,
            'new_message',
            'Nouveau message',
            'Message de ' || COALESCE(v_sender_name, 'votre agent'),
            '/client/messagerie',
            jsonb_build_object('conversation_id', NEW.conversation_id::text)
          );
        END IF;
      END IF;
      
      -- Notifier tous les autres agents de la conversation (sauf l'expéditeur)
      FOR v_agent_record IN
        SELECT DISTINCT a.user_id
        FROM conversation_agents ca
        JOIN agents a ON a.id::text = ca.agent_id
        WHERE ca.conversation_id = NEW.conversation_id
        AND a.user_id != NEW.sender_id::uuid
      LOOP
        PERFORM create_notification(
          v_agent_record.user_id,
          'new_message',
          'Nouveau message',
          'Message de ' || COALESCE(v_sender_name, 'un co-agent'),
          '/agent/messagerie',
          jsonb_build_object('conversation_id', NEW.conversation_id::text)
        );
      END LOOP;
      
    ELSIF NEW.sender_type = 'client' THEN
      -- Notifier tous les agents de la conversation
      FOR v_agent_record IN
        SELECT DISTINCT a.user_id
        FROM conversation_agents ca
        JOIN agents a ON a.id::text = ca.agent_id
        WHERE ca.conversation_id = NEW.conversation_id
      LOOP
        PERFORM create_notification(
          v_agent_record.user_id,
          'new_message',
          'Nouveau message',
          'Message de ' || COALESCE(v_sender_name, 'un client'),
          '/agent/messagerie',
          jsonb_build_object('conversation_id', NEW.conversation_id::text)
        );
      END LOOP;
      
      -- Notifier tous les admins
      FOR v_admin_record IN
        SELECT user_id FROM user_roles WHERE role = 'admin'
      LOOP
        PERFORM create_notification(
          v_admin_record.user_id,
          'new_message',
          'Nouveau message client',
          'Message de ' || COALESCE(v_sender_name, 'un client'),
          '/admin/messagerie',
          jsonb_build_object('conversation_id', NEW.conversation_id::text)
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;