
-- 1. Add 'agent_ia' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent_ia';

-- 2. Create ai_agents table
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'ai_agent',
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),
  assigned_manager UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email_channel TEXT DEFAULT 'outlook' CHECK (email_channel IN ('outlook', 'infomaniak', 'other')),
  allowed_actions JSONB NOT NULL DEFAULT '["search","prepare_draft","prepare_candidature","log_call","create_match","update_pipeline"]'::jsonb,
  requires_validation BOOLEAN NOT NULL DEFAULT true,
  security_level TEXT NOT NULL DEFAULT 'restricted',
  api_token_hash TEXT,
  webhook_url TEXT,
  audit_log_enabled BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create ai_agent_assignments table
CREATE TABLE public.ai_agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  priority TEXT DEFAULT 'moyenne' CHECK (priority IN ('basse', 'moyenne', 'haute', 'urgente')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ai_agent_id, client_id)
);

-- 4. Create ai_agent_actions table (audit log)
CREATE TABLE public.ai_agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  property_id UUID,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'search', 'prepare_draft', 'prepare_candidature', 'send_email',
    'submit_candidature', 'contact_agency', 'update_status', 'log_call',
    'create_match', 'update_pipeline', 'delete_data', 'trigger_external'
  )),
  action_payload JSONB DEFAULT '{}'::jsonb,
  draft_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  error_message TEXT,
  channel TEXT CHECK (channel IN ('email', 'flatfox', 'phone', 'agency_site', 'other')),
  source_type TEXT NOT NULL DEFAULT 'api' CHECK (source_type IN ('api', 'webhook', 'internal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create ai_agent_property_matches table
CREATE TABLE public.ai_agent_property_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_url TEXT,
  source_platform TEXT,
  title TEXT NOT NULL,
  address TEXT,
  location TEXT,
  price NUMERIC,
  rooms NUMERIC,
  surface NUMERIC,
  property_type TEXT,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  match_score NUMERIC,
  match_details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'found' CHECK (status IN ('found', 'proposed', 'sent', 'rejected', 'duplicate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create ai_agent_drafts table
CREATE TABLE public.ai_agent_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  property_match_id UUID REFERENCES public.ai_agent_property_matches(id) ON DELETE SET NULL,
  draft_type TEXT NOT NULL CHECK (draft_type IN ('email', 'candidature', 'message')),
  channel TEXT DEFAULT 'outlook' CHECK (channel IN ('outlook', 'infomaniak', 'flatfox', 'agency_site', 'other')),
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT,
  body TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'pending_approval', 'approved', 'sent', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create ai_agent_call_logs table
CREATE TABLE public.ai_agent_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  agency_name TEXT,
  contact_name TEXT,
  phone_number TEXT,
  call_script TEXT,
  call_notes TEXT,
  call_result TEXT,
  next_callback_at TIMESTAMPTZ,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'no_answer', 'callback', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enable RLS on all tables
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_property_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_call_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies — Admins full access
CREATE POLICY "Admins full access on ai_agents" ON public.ai_agents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on ai_agent_assignments" ON public.ai_agent_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on ai_agent_actions" ON public.ai_agent_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on ai_agent_property_matches" ON public.ai_agent_property_matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on ai_agent_drafts" ON public.ai_agent_drafts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on ai_agent_call_logs" ON public.ai_agent_call_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. RLS Policies — Agent IA read own data
CREATE POLICY "AI agent reads own profile" ON public.ai_agents FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "AI agent reads own assignments" ON public.ai_agent_assignments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
);

-- AI agent can INSERT actions for assigned clients only
CREATE POLICY "AI agent inserts own actions" ON public.ai_agent_actions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_agents ag
    JOIN public.ai_agent_assignments aa ON aa.ai_agent_id = ag.id
    WHERE ag.id = ai_agent_id AND ag.user_id = auth.uid()
    AND (client_id IS NULL OR aa.client_id = client_id)
    AND aa.status = 'active'
  )
);
CREATE POLICY "AI agent reads own actions" ON public.ai_agent_actions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
);

-- AI agent can INSERT property matches for assigned clients
CREATE POLICY "AI agent inserts matches" ON public.ai_agent_property_matches FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_agents ag
    JOIN public.ai_agent_assignments aa ON aa.ai_agent_id = ag.id
    WHERE ag.id = ai_agent_id AND ag.user_id = auth.uid()
    AND aa.client_id = client_id AND aa.status = 'active'
  )
);
CREATE POLICY "AI agent reads own matches" ON public.ai_agent_property_matches FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
);

-- AI agent can INSERT/UPDATE drafts
CREATE POLICY "AI agent manages own drafts" ON public.ai_agent_drafts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
);
CREATE POLICY "AI agent reads own drafts" ON public.ai_agent_drafts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
);
CREATE POLICY "AI agent updates own drafts" ON public.ai_agent_drafts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
);

-- AI agent can INSERT call logs
CREATE POLICY "AI agent inserts call logs" ON public.ai_agent_call_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
);
CREATE POLICY "AI agent reads own call logs" ON public.ai_agent_call_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_id AND user_id = auth.uid())
);

-- 11. Trigger to update last_activity_at on ai_agents
CREATE OR REPLACE FUNCTION public.update_ai_agent_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.ai_agents
  SET last_activity_at = now(), updated_at = now()
  WHERE id = NEW.ai_agent_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_agent_action_activity
  AFTER INSERT ON public.ai_agent_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_agent_last_activity();

-- 12. Updated_at trigger for ai_agents and ai_agent_drafts
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_agent_drafts_updated_at
  BEFORE UPDATE ON public.ai_agent_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
