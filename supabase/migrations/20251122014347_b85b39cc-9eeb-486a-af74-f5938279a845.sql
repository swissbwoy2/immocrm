-- Drop existing problematic RLS policies on conversations
DROP POLICY IF EXISTS "Agents can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

-- Drop existing problematic RLS policies on messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update read status of messages" ON public.messages;

-- Create correct RLS policies for conversations
CREATE POLICY "Agents can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id::text = agent_id
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  -- Agent can view their conversations
  EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id::text = agent_id
    AND agents.user_id = auth.uid()
  )
  OR
  -- Client can view their conversations
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id::text = client_id
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  -- Agent can update their conversations
  EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id::text = agent_id
    AND agents.user_id = auth.uid()
  )
  OR
  -- Client can update their conversations
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id::text = client_id
    AND clients.user_id = auth.uid()
  )
);

-- Create correct RLS policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE 
      EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.id::text = c.agent_id AND a.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.clients cl
        WHERE cl.id::text = c.client_id AND cl.user_id = auth.uid()
      )
  )
);

CREATE POLICY "Users can insert messages in their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE 
      EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.id::text = c.agent_id AND a.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.clients cl
        WHERE cl.id::text = c.client_id AND cl.user_id = auth.uid()
      )
  )
);

CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE 
      EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.id::text = c.agent_id AND a.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.clients cl
        WHERE cl.id::text = c.client_id AND cl.user_id = auth.uid()
      )
  )
);