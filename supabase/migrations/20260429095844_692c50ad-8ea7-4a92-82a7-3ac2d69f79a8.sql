-- 1. client_candidates : co-agents = mêmes droits que l'agent principal
DROP POLICY IF EXISTS "Agents can manage candidates of their clients" ON public.client_candidates;

CREATE POLICY "Agents (principal + co) can manage candidates"
ON public.client_candidates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.agents a ON a.id = c.agent_id
    WHERE c.id = client_candidates.client_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = client_candidates.client_id AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.agents a ON a.id = c.agent_id
    WHERE c.id = client_candidates.client_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.client_agents ca
    JOIN public.agents a ON a.id = ca.agent_id
    WHERE ca.client_id = client_candidates.client_id AND a.user_id = auth.uid()
  )
);

-- 2. documents (candidate_id) : co-agents inclus
DROP POLICY IF EXISTS "Agents can manage candidate documents" ON public.documents;

CREATE POLICY "Agents (principal + co) can manage candidate documents"
ON public.documents FOR ALL
TO authenticated
USING (
  candidate_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.client_candidates cc
      JOIN public.clients c ON c.id = cc.client_id
      JOIN public.agents a ON a.id = c.agent_id
      WHERE cc.id = documents.candidate_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.client_candidates cc
      JOIN public.client_agents ca ON ca.client_id = cc.client_id
      JOIN public.agents a ON a.id = ca.agent_id
      WHERE cc.id = documents.candidate_id AND a.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  candidate_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.client_candidates cc
      JOIN public.clients c ON c.id = cc.client_id
      JOIN public.agents a ON a.id = c.agent_id
      WHERE cc.id = documents.candidate_id AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.client_candidates cc
      JOIN public.client_agents ca ON ca.client_id = cc.client_id
      JOIN public.agents a ON a.id = ca.agent_id
      WHERE cc.id = documents.candidate_id AND a.user_id = auth.uid()
    )
  )
);

-- 3. Trigger : auto-inscrire les co-agents dans conversation_agents
CREATE OR REPLACE FUNCTION public.sync_co_agent_to_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_agents (conversation_id, agent_id)
  SELECT conv.id, NEW.agent_id
  FROM public.conversations conv
  WHERE conv.client_id = NEW.client_id::text
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_co_agent_conversations ON public.client_agents;
CREATE TRIGGER trg_sync_co_agent_conversations
AFTER INSERT ON public.client_agents
FOR EACH ROW
EXECUTE FUNCTION public.sync_co_agent_to_conversations();

-- Trigger réciproque : quand une nouvelle conversation est créée, inscrire tous les co-agents existants
CREATE OR REPLACE FUNCTION public.sync_existing_co_agents_to_new_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    INSERT INTO public.conversation_agents (conversation_id, agent_id)
    SELECT NEW.id, ca.agent_id
    FROM public.client_agents ca
    WHERE ca.client_id::text = NEW.client_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_co_agents_to_new_conv ON public.conversations;
CREATE TRIGGER trg_sync_co_agents_to_new_conv
AFTER INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.sync_existing_co_agents_to_new_conversation();

-- 4. Backfill : pour tous les couples (co-agent, conversation client) déjà existants
INSERT INTO public.conversation_agents (conversation_id, agent_id)
SELECT DISTINCT conv.id, ca.agent_id
FROM public.conversations conv
JOIN public.client_agents ca ON ca.client_id::text = conv.client_id
WHERE conv.client_id IS NOT NULL
ON CONFLICT DO NOTHING;