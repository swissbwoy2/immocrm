
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS journey_type text DEFAULT 'housing_search';

UPDATE public.clients SET journey_type = 'housing_search' WHERE journey_type IS NULL;

UPDATE public.clients c SET journey_type = 'property_reletting'
WHERE EXISTS (
  SELECT 1 FROM public.profiles p
  JOIN public.leads l ON lower(l.email) = lower(p.email)
  WHERE p.id = c.user_id
    AND (l.source = 'relouer-mon-appartement' OR l.formulaire ILIKE '%relouer%')
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_journey_type_check') THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_journey_type_check
      CHECK (journey_type IN ('housing_search','property_reletting','mixed'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_clients_journey_type ON public.clients(journey_type);

CREATE TABLE IF NOT EXISTS public.relouer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new_request',
  prenom text, nom text, email text, telephone text, requester_role text,
  property_street text, property_number text, property_zip text, property_city text,
  property_canton text, property_type text, rooms numeric, surface numeric, floor int,
  has_elevator boolean DEFAULT false, has_balcony boolean DEFAULT false,
  has_terrace boolean DEFAULT false, has_garden boolean DEFAULT false,
  has_cellar boolean DEFAULT false, has_indoor_parking boolean DEFAULT false,
  has_outdoor_parking boolean DEFAULT false, has_box boolean DEFAULT false,
  furnished boolean DEFAULT false, pets_allowed boolean DEFAULT false,
  rent_net numeric, charges numeric, rent_gross numeric, guarantee_amount numeric,
  availability_date date, current_lease_end_date date,
  resignation_sent boolean DEFAULT false, resignation_date date,
  description text, special_features text,
  agency_name text, agency_contact_name text, agency_email text,
  agency_phone text, agency_address text, lease_reference text,
  visit_contact_type text, visit_contact_name text, visit_contact_email text,
  visit_contact_phone text, visit_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relouer_requests TO authenticated;
GRANT ALL ON public.relouer_requests TO service_role;
ALTER TABLE public.relouer_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_relouer_requests_user_id ON public.relouer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_relouer_requests_agent ON public.relouer_requests(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_relouer_requests_status ON public.relouer_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_relouer_user_lead
  ON public.relouer_requests(user_id, lead_id) WHERE user_id IS NOT NULL AND lead_id IS NOT NULL;

CREATE POLICY "Admins manage relouer_requests" ON public.relouer_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agent reads relouer_requests" ON public.relouer_requests
  FOR SELECT TO authenticated USING (assigned_agent_id = public.get_my_agent_id());
CREATE POLICY "Agent updates relouer_requests" ON public.relouer_requests
  FOR UPDATE TO authenticated
  USING (assigned_agent_id = public.get_my_agent_id())
  WITH CHECK (assigned_agent_id = public.get_my_agent_id());
CREATE POLICY "Owner reads relouer_requests" ON public.relouer_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner updates relouer_requests" ON public.relouer_requests
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.relouer_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.relouer_requests(id) ON DELETE CASCADE,
  storage_path text NOT NULL, category text,
  is_primary boolean DEFAULT false, display_order int DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', admin_comment text, uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relouer_photos TO authenticated;
GRANT ALL ON public.relouer_photos TO service_role;
ALTER TABLE public.relouer_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_relouer_photos_request ON public.relouer_photos(request_id);
CREATE POLICY "Admins manage relouer_photos" ON public.relouer_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agent manages relouer_photos" ON public.relouer_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()));
CREATE POLICY "Owner manages relouer_photos" ON public.relouer_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.user_id=auth.uid()));

CREATE TABLE IF NOT EXISTS public.relouer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.relouer_requests(id) ON DELETE CASCADE,
  storage_path text NOT NULL, document_type text NOT NULL, filename text,
  status text NOT NULL DEFAULT 'pending', admin_comment text, uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relouer_documents TO authenticated;
GRANT ALL ON public.relouer_documents TO service_role;
ALTER TABLE public.relouer_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_relouer_documents_request ON public.relouer_documents(request_id);
CREATE POLICY "Admins manage relouer_documents" ON public.relouer_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agent manages relouer_documents" ON public.relouer_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()));
CREATE POLICY "Owner manages relouer_documents" ON public.relouer_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.user_id=auth.uid()));

CREATE TABLE IF NOT EXISTS public.relouer_visit_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.relouer_requests(id) ON DELETE CASCADE,
  slot_start timestamptz NOT NULL, slot_end timestamptz NOT NULL,
  capacity int DEFAULT 1, status text NOT NULL DEFAULT 'proposed',
  notes text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relouer_visit_slots TO authenticated;
GRANT ALL ON public.relouer_visit_slots TO service_role;
ALTER TABLE public.relouer_visit_slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_relouer_slots_request ON public.relouer_visit_slots(request_id);
CREATE POLICY "Admins manage relouer_visit_slots" ON public.relouer_visit_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agent manages relouer_visit_slots" ON public.relouer_visit_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()));
CREATE POLICY "Owner manages relouer_visit_slots" ON public.relouer_visit_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.user_id=auth.uid()));

CREATE TABLE IF NOT EXISTS public.relouer_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.relouer_requests(id) ON DELETE CASCADE,
  prenom text, nom text, email text, phone text,
  income_monthly numeric, permit_type text, id_document_path text,
  status text NOT NULL DEFAULT 'new', agent_notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relouer_candidates TO authenticated;
GRANT ALL ON public.relouer_candidates TO service_role;
ALTER TABLE public.relouer_candidates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_relouer_candidates_request ON public.relouer_candidates(request_id);
CREATE POLICY "Admins manage relouer_candidates" ON public.relouer_candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agent manages relouer_candidates" ON public.relouer_candidates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()));
CREATE POLICY "Owner reads relouer_candidates" ON public.relouer_candidates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.user_id=auth.uid()));

CREATE TABLE IF NOT EXISTS public.relouer_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.relouer_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL, payload jsonb, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.relouer_timeline TO authenticated;
GRANT ALL ON public.relouer_timeline TO service_role;
ALTER TABLE public.relouer_timeline ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_relouer_timeline_request ON public.relouer_timeline(request_id);
CREATE POLICY "Admins manage relouer_timeline" ON public.relouer_timeline FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agent reads relouer_timeline" ON public.relouer_timeline FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()));
CREATE POLICY "Agent inserts relouer_timeline" ON public.relouer_timeline FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()));
CREATE POLICY "Owner reads relouer_timeline" ON public.relouer_timeline FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.user_id=auth.uid()));

CREATE TABLE IF NOT EXISTS public.relouer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.relouer_requests(id) ON DELETE CASCADE,
  author_id uuid, body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relouer_notes TO authenticated;
GRANT ALL ON public.relouer_notes TO service_role;
ALTER TABLE public.relouer_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_relouer_notes_request ON public.relouer_notes(request_id);
CREATE POLICY "Admins manage relouer_notes" ON public.relouer_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agent manages relouer_notes" ON public.relouer_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.relouer_requests r WHERE r.id=request_id AND r.assigned_agent_id=public.get_my_agent_id()));

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['relouer_requests','relouer_photos','relouer_documents','relouer_visit_slots','relouer_candidates','relouer_notes']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END$$;
