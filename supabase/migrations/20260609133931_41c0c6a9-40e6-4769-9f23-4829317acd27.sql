
-- Enum status
DO $$ BEGIN
  CREATE TYPE public.agent_share_status AS ENUM ('pending','accepted','declined','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Table
CREATE TABLE IF NOT EXISTS public.agent_calendar_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  recipient_agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status public.agent_share_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT agent_share_distinct CHECK (requester_agent_id <> recipient_agent_id),
  CONSTRAINT agent_share_unique UNIQUE (requester_agent_id, recipient_agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_calendar_shares_recipient
  ON public.agent_calendar_shares(recipient_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_calendar_shares_requester
  ON public.agent_calendar_shares(requester_agent_id, status);

-- 2. GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_calendar_shares TO authenticated;
GRANT ALL ON public.agent_calendar_shares TO service_role;

-- 3. RLS
ALTER TABLE public.agent_calendar_shares ENABLE ROW LEVEL SECURITY;

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_agent_calendar_shares_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    NEW.accepted_at = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_agent_calendar_shares_updated_at ON public.agent_calendar_shares;
CREATE TRIGGER trg_agent_calendar_shares_updated_at
BEFORE UPDATE ON public.agent_calendar_shares
FOR EACH ROW EXECUTE FUNCTION public.tg_agent_calendar_shares_updated_at();

-- 5. Helper: shared agent ids (SECURITY DEFINER, plpgsql)
CREATE OR REPLACE FUNCTION public.get_my_shared_agent_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
BEGIN
  SELECT id INTO me FROM public.agents WHERE user_id = auth.uid() LIMIT 1;
  IF me IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT CASE WHEN s.requester_agent_id = me THEN s.recipient_agent_id ELSE s.requester_agent_id END
    FROM public.agent_calendar_shares s
    WHERE s.status = 'accepted'
      AND (s.requester_agent_id = me OR s.recipient_agent_id = me);
END $$;

GRANT EXECUTE ON FUNCTION public.get_my_shared_agent_ids() TO authenticated, service_role;

-- 6. RLS policies on agent_calendar_shares
DROP POLICY IF EXISTS "Agents view their shares" ON public.agent_calendar_shares;
CREATE POLICY "Agents view their shares"
ON public.agent_calendar_shares FOR SELECT
TO authenticated
USING (
  requester_agent_id = public.get_my_agent_id()
  OR recipient_agent_id = public.get_my_agent_id()
);

DROP POLICY IF EXISTS "Agents create their shares" ON public.agent_calendar_shares;
CREATE POLICY "Agents create their shares"
ON public.agent_calendar_shares FOR INSERT
TO authenticated
WITH CHECK (
  requester_agent_id = public.get_my_agent_id()
  AND status = 'pending'
);

DROP POLICY IF EXISTS "Recipient or requester update shares" ON public.agent_calendar_shares;
CREATE POLICY "Recipient or requester update shares"
ON public.agent_calendar_shares FOR UPDATE
TO authenticated
USING (
  recipient_agent_id = public.get_my_agent_id()
  OR requester_agent_id = public.get_my_agent_id()
)
WITH CHECK (
  recipient_agent_id = public.get_my_agent_id()
  OR requester_agent_id = public.get_my_agent_id()
);

DROP POLICY IF EXISTS "Agents delete their pending shares" ON public.agent_calendar_shares;
CREATE POLICY "Agents delete their pending shares"
ON public.agent_calendar_shares FOR DELETE
TO authenticated
USING (
  requester_agent_id = public.get_my_agent_id()
  OR recipient_agent_id = public.get_my_agent_id()
);

DROP POLICY IF EXISTS "Admins manage all shares" ON public.agent_calendar_shares;
CREATE POLICY "Admins manage all shares"
ON public.agent_calendar_shares FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Extend RLS on visites, calendar_events, visite_comptes_rendus

-- visites
DROP POLICY IF EXISTS "Shared agents can manage visites" ON public.visites;
CREATE POLICY "Shared agents can manage visites"
ON public.visites FOR ALL
TO authenticated
USING (agent_id IN (SELECT public.get_my_shared_agent_ids()))
WITH CHECK (agent_id IN (SELECT public.get_my_shared_agent_ids()));

-- calendar_events
DROP POLICY IF EXISTS "Shared agents can manage calendar events" ON public.calendar_events;
CREATE POLICY "Shared agents can manage calendar events"
ON public.calendar_events FOR ALL
TO authenticated
USING (agent_id IN (SELECT public.get_my_shared_agent_ids()))
WITH CHECK (agent_id IN (SELECT public.get_my_shared_agent_ids()));

-- visite_comptes_rendus (linked via visite -> agent)
DROP POLICY IF EXISTS "Shared agents can manage CR" ON public.visite_comptes_rendus;
CREATE POLICY "Shared agents can manage CR"
ON public.visite_comptes_rendus FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.visites v
    WHERE v.id = visite_comptes_rendus.visite_id
      AND v.agent_id IN (SELECT public.get_my_shared_agent_ids())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.visites v
    WHERE v.id = visite_comptes_rendus.visite_id
      AND v.agent_id IN (SELECT public.get_my_shared_agent_ids())
  )
);

-- 8. Realtime
ALTER TABLE public.agent_calendar_shares REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='agent_calendar_shares';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_calendar_shares';
  END IF;
END $$;
