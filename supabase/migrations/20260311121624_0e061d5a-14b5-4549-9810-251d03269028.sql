
-- ============================================================
-- Step 1: Logisorama AI Relocation — Full SQL Migration
-- ============================================================

-- =========================
-- 1. ENUMS
-- =========================
CREATE TYPE public.mission_status AS ENUM ('en_attente', 'active', 'en_pause', 'terminee', 'suspendue', 'erreur');
CREATE TYPE public.mission_frequency AS ENUM ('quotidien', 'hebdomadaire', 'manuel');
CREATE TYPE public.execution_run_status AS ENUM ('running', 'completed', 'failed');
CREATE TYPE public.property_result_status AS ENUM ('nouveau', 'retenu', 'rejete', 'envoye_au_client', 'candidature_preparee', 'visite_proposee', 'visite_demandee', 'visite_confirmee', 'archive');
CREATE TYPE public.score_label AS ENUM ('excellent', 'bon', 'moyen', 'faible');
CREATE TYPE public.offer_status AS ENUM ('brouillon', 'pret', 'en_attente_validation', 'envoye', 'refuse', 'erreur');
CREATE TYPE public.visit_request_status AS ENUM ('non_traite', 'a_proposer', 'demande_prete', 'en_attente_validation', 'demande_envoyee', 'en_attente_reponse', 'visite_confirmee', 'visite_refusee', 'visite_annulee', 'visite_a_effectuer');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'modified');
CREATE TYPE public.approval_type AS ENUM ('offer', 'visit', 'external_action');
CREATE TYPE public.connector_type AS ENUM ('web_scraper', 'api', 'flatfox', 'homegate', 'immoscout', 'autre');

-- =========================
-- 2. TABLES
-- =========================

-- 2.1 source_connectors
CREATE TABLE public.source_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text,
  connector_type public.connector_type NOT NULL DEFAULT 'autre',
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  rate_limit_per_hour integer,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.source_connectors ENABLE ROW LEVEL SECURITY;

-- 2.2 search_missions
CREATE TABLE public.search_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ai_agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.ai_agent_assignments(id) ON DELETE SET NULL,
  criteria_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency public.mission_frequency NOT NULL DEFAULT 'manuel',
  allowed_sources text[],
  status public.mission_status NOT NULL DEFAULT 'en_attente',
  last_run_at timestamptz,
  next_run_at timestamptz,
  results_found integer NOT NULL DEFAULT 0,
  results_retained integer NOT NULL DEFAULT 0,
  offers_sent integer NOT NULL DEFAULT 0,
  visits_proposed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.search_missions ENABLE ROW LEVEL SECURITY;

-- 2.3 mission_execution_runs
CREATE TABLE public.mission_execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.search_missions(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status public.execution_run_status NOT NULL DEFAULT 'running',
  sources_searched text[],
  results_found integer NOT NULL DEFAULT 0,
  results_new integer NOT NULL DEFAULT 0,
  duplicates_detected integer NOT NULL DEFAULT 0,
  error_message text,
  execution_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_execution_runs ENABLE ROW LEVEL SECURITY;

-- 2.4 property_results
CREATE TABLE public.property_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.search_missions(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ai_agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  source_name text,
  source_url text,
  external_listing_id text,
  title text NOT NULL,
  address text,
  postal_code text,
  city text,
  canton text,
  rent_amount numeric,
  charges_amount numeric,
  total_amount numeric,
  number_of_rooms numeric,
  living_area numeric,
  availability_date text,
  description text,
  images jsonb DEFAULT '[]'::jsonb,
  contact_name text,
  contact_email text,
  contact_phone text,
  visit_booking_link text,
  application_channel text,
  extraction_timestamp timestamptz,
  duplicate_status boolean NOT NULL DEFAULT false,
  duplicate_of_id uuid REFERENCES public.property_results(id) ON DELETE SET NULL,
  match_score numeric,
  match_reason text,
  result_status public.property_result_status NOT NULL DEFAULT 'nouveau',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_results ENABLE ROW LEVEL SECURITY;

-- 2.5 property_result_scores
CREATE TABLE public.property_result_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_result_id uuid NOT NULL REFERENCES public.property_results(id) ON DELETE CASCADE UNIQUE,
  overall_score numeric,
  budget_score numeric,
  location_score numeric,
  rooms_score numeric,
  surface_score numeric,
  availability_score numeric,
  type_score numeric,
  mandatory_criteria_score numeric,
  preferred_criteria_score numeric,
  score_label public.score_label,
  score_explanation text,
  calculated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_result_scores ENABLE ROW LEVEL SECURITY;

-- 2.6 client_offer_messages
CREATE TABLE public.client_offer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ai_agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  property_result_ids uuid[] DEFAULT '{}'::uuid[],
  message_subject text,
  message_body text,
  channel text,
  status public.offer_status NOT NULL DEFAULT 'brouillon',
  approval_required boolean NOT NULL DEFAULT true,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_offer_messages ENABLE ROW LEVEL SECURITY;

-- 2.7 visit_requests
CREATE TABLE public.visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_result_id uuid NOT NULL REFERENCES public.property_results(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ai_agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.search_missions(id) ON DELETE SET NULL,
  contact_message text,
  proposed_slots jsonb DEFAULT '[]'::jsonb,
  status public.visit_request_status NOT NULL DEFAULT 'non_traite',
  approval_required boolean NOT NULL DEFAULT true,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  sent_at timestamptz,
  response_received_at timestamptz,
  confirmed_date timestamptz,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_response text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

-- 2.8 approval_requests
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type public.approval_type NOT NULL,
  reference_id uuid NOT NULL,
  reference_table text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ai_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  payload jsonb DEFAULT '{}'::jsonb,
  status public.approval_status NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- 2.9 ai_agent_activity_logs
CREATE TABLE public.ai_agent_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES public.search_missions(id) ON DELETE SET NULL,
  property_result_id uuid REFERENCES public.property_results(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_source text,
  content_generated text,
  validation_required boolean DEFAULT false,
  validated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  validation_result text,
  error_message text,
  connector_used text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_activity_logs ENABLE ROW LEVEL SECURITY;

-- =========================
-- 3. ALTER ai_agent_assignments
-- =========================
ALTER TABLE public.ai_agent_assignments
  ADD COLUMN IF NOT EXISTS urgency_level text,
  ADD COLUMN IF NOT EXISTS allowed_sources text[],
  ADD COLUMN IF NOT EXISTS allowed_actions jsonb,
  ADD COLUMN IF NOT EXISTS approval_required_for_offers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_required_for_visits boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_send_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_visit_booking_enabled boolean NOT NULL DEFAULT false;

-- =========================
-- 4. INDEXES on property_results
-- =========================
CREATE INDEX idx_property_results_client_id ON public.property_results(client_id);
CREATE INDEX idx_property_results_mission_id ON public.property_results(mission_id);
CREATE INDEX idx_property_results_ai_agent_id ON public.property_results(ai_agent_id);
CREATE INDEX idx_property_results_external_listing_id ON public.property_results(external_listing_id);
CREATE INDEX idx_property_results_source_name ON public.property_results(source_name);
CREATE INDEX idx_property_results_result_status ON public.property_results(result_status);
CREATE UNIQUE INDEX idx_property_results_dedup ON public.property_results(source_name, external_listing_id, client_id) WHERE source_name IS NOT NULL AND external_listing_id IS NOT NULL;

-- =========================
-- 5. RLS POLICIES
-- =========================

-- source_connectors: admin CRUD, authenticated SELECT
CREATE POLICY "admin_all_source_connectors" ON public.source_connectors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authenticated_select_source_connectors" ON public.source_connectors FOR SELECT TO authenticated USING (true);

-- search_missions
CREATE POLICY "admin_all_search_missions" ON public.search_missions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agent_ia_select_search_missions" ON public.search_missions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = search_missions.ai_agent_id AND user_id = auth.uid()));

-- mission_execution_runs
CREATE POLICY "admin_all_mission_execution_runs" ON public.mission_execution_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agent_ia_select_mission_execution_runs" ON public.mission_execution_runs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.search_missions sm JOIN public.ai_agents ag ON ag.id = sm.ai_agent_id WHERE sm.id = mission_execution_runs.mission_id AND ag.user_id = auth.uid()));
CREATE POLICY "agent_ia_insert_mission_execution_runs" ON public.mission_execution_runs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.search_missions sm JOIN public.ai_agents ag ON ag.id = sm.ai_agent_id WHERE sm.id = mission_execution_runs.mission_id AND ag.user_id = auth.uid()));

-- property_results
CREATE POLICY "admin_all_property_results" ON public.property_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agent_ia_select_property_results" ON public.property_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = property_results.ai_agent_id AND user_id = auth.uid()));
CREATE POLICY "agent_ia_insert_property_results" ON public.property_results FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = property_results.ai_agent_id AND user_id = auth.uid()));

-- property_result_scores
CREATE POLICY "admin_all_property_result_scores" ON public.property_result_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agent_ia_select_property_result_scores" ON public.property_result_scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.property_results pr JOIN public.ai_agents ag ON ag.id = pr.ai_agent_id WHERE pr.id = property_result_scores.property_result_id AND ag.user_id = auth.uid()));

-- client_offer_messages
CREATE POLICY "admin_all_client_offer_messages" ON public.client_offer_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agent_ia_select_client_offer_messages" ON public.client_offer_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = client_offer_messages.ai_agent_id AND user_id = auth.uid()));

-- visit_requests
CREATE POLICY "admin_all_visit_requests" ON public.visit_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agent_ia_select_visit_requests" ON public.visit_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = visit_requests.ai_agent_id AND user_id = auth.uid()));

-- approval_requests
CREATE POLICY "admin_all_approval_requests" ON public.approval_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agent_ia_select_approval_requests" ON public.approval_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = approval_requests.ai_agent_id AND user_id = auth.uid()));

-- ai_agent_activity_logs
CREATE POLICY "admin_all_ai_agent_activity_logs" ON public.ai_agent_activity_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agent_ia_select_ai_agent_activity_logs" ON public.ai_agent_activity_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_activity_logs.ai_agent_id AND user_id = auth.uid()));
CREATE POLICY "agent_ia_insert_ai_agent_activity_logs" ON public.ai_agent_activity_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = ai_agent_activity_logs.ai_agent_id AND user_id = auth.uid()));

-- =========================
-- 6. TRIGGERS (updated_at)
-- =========================
CREATE TRIGGER trg_search_missions_updated_at BEFORE UPDATE ON public.search_missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_property_results_updated_at BEFORE UPDATE ON public.property_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_client_offer_messages_updated_at BEFORE UPDATE ON public.client_offer_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_visit_requests_updated_at BEFORE UPDATE ON public.visit_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update ai_agents.last_activity_at on activity log insert
CREATE TRIGGER trg_ai_activity_log_activity AFTER INSERT ON public.ai_agent_activity_logs FOR EACH ROW EXECUTE FUNCTION public.update_ai_agent_last_activity();

-- =========================
-- 7. DB FUNCTIONS
-- =========================

-- 7.1 calculate_match_score
CREATE OR REPLACE FUNCTION public.calculate_match_score(p_property_result_id uuid, p_criteria jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prop RECORD;
  v_budget_score numeric := 0;
  v_location_score numeric := 0;
  v_rooms_score numeric := 0;
  v_surface_score numeric := 0;
  v_type_score numeric := 0;
  v_availability_score numeric := 100;
  v_mandatory_score numeric := 100;
  v_preferred_score numeric := 0;
  v_overall numeric := 0;
  v_label public.score_label;
  v_explanation text := '';
  v_criteria_budget numeric;
  v_criteria_city text;
  v_criteria_rooms numeric;
  v_criteria_surface numeric;
  v_criteria_type text;
BEGIN
  SELECT * INTO v_prop FROM property_results WHERE id = p_property_result_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_criteria_budget := (p_criteria->>'budget_max')::numeric;
  v_criteria_city := p_criteria->>'city';
  v_criteria_rooms := (p_criteria->>'rooms')::numeric;
  v_criteria_surface := (p_criteria->>'surface_min')::numeric;
  v_criteria_type := p_criteria->>'type_bien';

  -- Budget score
  IF v_criteria_budget IS NOT NULL AND v_prop.total_amount IS NOT NULL THEN
    IF v_prop.total_amount <= v_criteria_budget THEN
      v_budget_score := 100;
    ELSIF v_prop.total_amount <= v_criteria_budget * 1.2 THEN
      v_budget_score := 50;
    ELSE
      v_budget_score := 0;
      v_mandatory_score := 0;
    END IF;
  ELSIF v_criteria_budget IS NULL THEN
    v_budget_score := 100;
  END IF;

  -- Location score
  IF v_criteria_city IS NOT NULL AND v_prop.city IS NOT NULL THEN
    IF lower(v_prop.city) = lower(v_criteria_city) THEN
      v_location_score := 100;
    ELSIF v_prop.canton IS NOT NULL AND lower(v_prop.canton) = lower(COALESCE(p_criteria->>'canton', '')) THEN
      v_location_score := 50;
    ELSE
      v_location_score := 0;
    END IF;
  ELSE
    v_location_score := 100;
  END IF;

  -- Rooms score
  IF v_criteria_rooms IS NOT NULL AND v_prop.number_of_rooms IS NOT NULL THEN
    IF v_prop.number_of_rooms = v_criteria_rooms THEN
      v_rooms_score := 100;
    ELSIF abs(v_prop.number_of_rooms - v_criteria_rooms) <= 1 THEN
      v_rooms_score := 50;
    ELSE
      v_rooms_score := 0;
    END IF;
  ELSE
    v_rooms_score := 100;
  END IF;

  -- Surface score
  IF v_criteria_surface IS NOT NULL AND v_prop.living_area IS NOT NULL THEN
    IF v_prop.living_area >= v_criteria_surface THEN
      v_surface_score := 100;
    ELSIF v_prop.living_area >= v_criteria_surface * 0.8 THEN
      v_surface_score := 50;
    ELSE
      v_surface_score := 0;
    END IF;
  ELSE
    v_surface_score := 100;
  END IF;

  -- Type score
  IF v_criteria_type IS NOT NULL AND v_prop.description IS NOT NULL THEN
    IF lower(COALESCE(v_prop.title, '') || ' ' || COALESCE(v_prop.description, '')) LIKE '%' || lower(v_criteria_type) || '%' THEN
      v_type_score := 100;
    ELSE
      v_type_score := 0;
    END IF;
  ELSE
    v_type_score := 100;
  END IF;

  -- Weighted average
  v_overall := (v_budget_score * 30 + v_location_score * 25 + v_rooms_score * 20 + v_surface_score * 15 + v_type_score * 10) / 100.0;
  IF v_mandatory_score = 0 THEN v_overall := LEAST(v_overall, 25); END IF;

  v_preferred_score := (v_rooms_score + v_surface_score + v_type_score) / 3.0;

  -- Label
  IF v_overall >= 80 THEN v_label := 'excellent';
  ELSIF v_overall >= 60 THEN v_label := 'bon';
  ELSIF v_overall >= 40 THEN v_label := 'moyen';
  ELSE v_label := 'faible';
  END IF;

  v_explanation := format('Budget: %s | Localisation: %s | Pièces: %s | Surface: %s | Type: %s → Score global: %s (%s)',
    v_budget_score, v_location_score, v_rooms_score, v_surface_score, v_type_score, round(v_overall, 1), v_label);

  -- Upsert score
  INSERT INTO property_result_scores (property_result_id, overall_score, budget_score, location_score, rooms_score, surface_score, availability_score, type_score, mandatory_criteria_score, preferred_criteria_score, score_label, score_explanation, calculated_at)
  VALUES (p_property_result_id, v_overall, v_budget_score, v_location_score, v_rooms_score, v_surface_score, v_availability_score, v_type_score, v_mandatory_score, v_preferred_score, v_label, v_explanation, now())
  ON CONFLICT (property_result_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score, budget_score = EXCLUDED.budget_score, location_score = EXCLUDED.location_score,
    rooms_score = EXCLUDED.rooms_score, surface_score = EXCLUDED.surface_score, availability_score = EXCLUDED.availability_score,
    type_score = EXCLUDED.type_score, mandatory_criteria_score = EXCLUDED.mandatory_criteria_score, preferred_criteria_score = EXCLUDED.preferred_criteria_score,
    score_label = EXCLUDED.score_label, score_explanation = EXCLUDED.score_explanation, calculated_at = EXCLUDED.calculated_at;

  -- Update property_results
  UPDATE property_results SET match_score = v_overall, match_reason = v_explanation WHERE id = p_property_result_id;
END;
$$;

-- 7.2 log_ai_activity
CREATE OR REPLACE FUNCTION public.log_ai_activity(
  p_ai_agent_id uuid,
  p_action_type text,
  p_client_id uuid DEFAULT NULL,
  p_mission_id uuid DEFAULT NULL,
  p_property_result_id uuid DEFAULT NULL,
  p_action_source text DEFAULT NULL,
  p_content_generated text DEFAULT NULL,
  p_validation_required boolean DEFAULT false,
  p_error_message text DEFAULT NULL,
  p_connector_used text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO ai_agent_activity_logs (ai_agent_id, client_id, mission_id, property_result_id, action_type, action_source, content_generated, validation_required, error_message, connector_used, metadata)
  VALUES (p_ai_agent_id, p_client_id, p_mission_id, p_property_result_id, p_action_type, p_action_source, p_content_generated, p_validation_required, p_error_message, p_connector_used, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 7.3 create_approval_request
CREATE OR REPLACE FUNCTION public.create_approval_request(
  p_request_type public.approval_type,
  p_reference_id uuid,
  p_reference_table text,
  p_title text,
  p_client_id uuid DEFAULT NULL,
  p_ai_agent_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO approval_requests (request_type, reference_id, reference_table, title, client_id, ai_agent_id, description, payload)
  VALUES (p_request_type, p_reference_id, p_reference_table, p_title, p_client_id, p_ai_agent_id, p_description, p_payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
