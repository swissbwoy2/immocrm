-- Rendre client_id nullable pour permettre les conversations admin-agent
ALTER TABLE public.conversations ALTER COLUMN client_id DROP NOT NULL;

-- Ajouter un type de conversation
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS conversation_type text DEFAULT 'client-agent';

-- Ajouter admin_user_id pour les conversations admin-agent
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS admin_user_id uuid;

-- Mettre à jour les politiques RLS pour les conversations admin-agent

-- Admins peuvent créer des conversations admin-agent
DROP POLICY IF EXISTS "Admins can create conversations" ON public.conversations;
CREATE POLICY "Admins can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Agents peuvent créer des conversations admin-agent
DROP POLICY IF EXISTS "Agents can create conversations" ON public.conversations;
CREATE POLICY "Agents can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id::text = conversations.agent_id
    AND agents.user_id = auth.uid()
  )
);

-- Agents peuvent voir leurs conversations (client-agent ET admin-agent)
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  -- Conversations client-agent où l'agent est impliqué
  (EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id::text = conversations.agent_id
    AND agents.user_id = auth.uid()
  ))
  OR
  -- Conversations où le client est impliqué
  (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id::text = conversations.client_id
    AND clients.user_id = auth.uid()
  ))
);

-- Mettre à jour la politique de mise à jour
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations"
ON public.conversations FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id::text = conversations.agent_id
    AND agents.user_id = auth.uid()
  ))
  OR
  (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id::text = conversations.client_id
    AND clients.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Mettre à jour les politiques des messages pour inclure les conversations admin-agent
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE 
      -- Agent impliqué
      (EXISTS (
        SELECT 1 FROM agents a
        WHERE a.id::text = c.agent_id
        AND a.user_id = auth.uid()
      ))
      OR
      -- Client impliqué
      (c.client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM clients cl
        WHERE cl.id::text = c.client_id
        AND cl.user_id = auth.uid()
      ))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
CREATE POLICY "Users can insert messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE 
      (EXISTS (
        SELECT 1 FROM agents a
        WHERE a.id::text = c.agent_id
        AND a.user_id = auth.uid()
      ))
      OR
      (c.client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM clients cl
        WHERE cl.id::text = c.client_id
        AND cl.user_id = auth.uid()
      ))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
CREATE POLICY "Users can update messages in their conversations"
ON public.messages FOR UPDATE
USING (
  conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE 
      (EXISTS (
        SELECT 1 FROM agents a
        WHERE a.id::text = c.agent_id
        AND a.user_id = auth.uid()
      ))
      OR
      (c.client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM clients cl
        WHERE cl.id::text = c.client_id
        AND cl.user_id = auth.uid()
      ))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);