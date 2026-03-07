
-- Table meta_leads
CREATE TABLE public.meta_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT DEFAULT 'meta_leadgen',
  leadgen_id TEXT UNIQUE NOT NULL,
  page_id TEXT,
  page_name TEXT,
  form_id TEXT,
  form_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  adset_id TEXT,
  adset_name TEXT,
  ad_id TEXT,
  ad_name TEXT,
  ad_reference_label TEXT,
  ad_reference_url TEXT,
  is_organic BOOLEAN DEFAULT false,
  lead_created_time_meta TIMESTAMPTZ,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  postal_code TEXT,
  raw_answers JSONB,
  raw_meta_payload JSONB,
  lead_status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID,
  notes TEXT,
  imported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table meta_lead_logs
CREATE TABLE public.meta_lead_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leadgen_id TEXT,
  page_id TEXT,
  form_id TEXT,
  ad_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes on meta_leads
CREATE INDEX idx_meta_leads_leadgen_id ON public.meta_leads (leadgen_id);
CREATE INDEX idx_meta_leads_created_at ON public.meta_leads (created_at DESC);
CREATE INDEX idx_meta_leads_lead_status ON public.meta_leads (lead_status);
CREATE INDEX idx_meta_leads_campaign_id ON public.meta_leads (campaign_id);
CREATE INDEX idx_meta_leads_ad_id ON public.meta_leads (ad_id);
CREATE INDEX idx_meta_leads_form_id ON public.meta_leads (form_id);

-- Index on meta_lead_logs
CREATE INDEX idx_meta_lead_logs_leadgen_id ON public.meta_lead_logs (leadgen_id);

-- RLS on meta_leads
ALTER TABLE public.meta_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select meta_leads"
  ON public.meta_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update meta_leads"
  ON public.meta_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS on meta_lead_logs
ALTER TABLE public.meta_lead_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select meta_lead_logs"
  ON public.meta_lead_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at on meta_leads
CREATE TRIGGER update_meta_leads_updated_at
  BEFORE UPDATE ON public.meta_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
