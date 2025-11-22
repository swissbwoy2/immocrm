-- Politique pour permettre aux clients de voir leur agent assigné
CREATE POLICY "Clients can view their assigned agent"
ON public.agents
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT agent_id 
    FROM public.clients 
    WHERE user_id = auth.uid() 
    AND agent_id IS NOT NULL
  )
);

-- Politique pour permettre aux clients de voir le profil de leur agent assigné
CREATE POLICY "Clients can view their agent profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT a.user_id
    FROM public.agents a
    JOIN public.clients c ON c.agent_id = a.id
    WHERE c.user_id = auth.uid()
  )
);

-- Politique pour permettre aux admins de voir toutes les conversations
CREATE POLICY "Admins can view all conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de créer des conversations
CREATE POLICY "Admins can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de modifier des conversations
CREATE POLICY "Admins can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de supprimer des conversations
CREATE POLICY "Admins can delete conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de voir tous les messages
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de créer des messages
CREATE POLICY "Admins can create messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de modifier des messages
CREATE POLICY "Admins can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de supprimer des messages
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de voir toutes les visites
CREATE POLICY "Admins can view all visites"
ON public.visites
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique pour permettre aux admins de supprimer des agents
CREATE POLICY "Admins can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));