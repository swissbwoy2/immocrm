-- ============================================================
-- RÉNOVATION INTELLIGENTE — MIGRATION 2 : TABLES MÉTIER + INDEXES
-- ============================================================

-- 1. renovation_companies
CREATE TABLE public.renovation_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  siret TEXT,
  specialties TEXT[],
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'CH',
  website TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. renovation_company_users
CREATE TABLE public.renovation_company_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.renovation_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- 3. renovation_project_companies
CREATE TABLE public.renovation_project_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.renovation_companies(id) ON DELETE RESTRICT,
  role public.renovation_company_role NOT NULL DEFAULT 'subcontractor',
  lot_name TEXT,
  start_date DATE,
  end_date DATE,
  contract_amount NUMERIC(12,2),
  public_note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, company_id)
);

-- 4. renovation_company_scores (données sensibles — accès bloqué pour company_users)
CREATE TABLE public.renovation_company_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.renovation_companies(id) ON DELETE CASCADE,
  score_quality NUMERIC(3,1),
  score_deadline NUMERIC(3,1),
  score_budget NUMERIC(3,1),
  score_communication NUMERIC(3,1),
  score_safety NUMERIC(3,1),
  final_score NUMERIC(3,1),
  score_explanation TEXT,
  scored_by UUID REFERENCES public.profiles(id),
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, company_id)
);

-- 5. renovation_quotes
CREATE TABLE public.renovation_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.renovation_companies(id) ON DELETE RESTRICT,
  file_id UUID REFERENCES public.renovation_project_files(id),
  reference TEXT,
  title TEXT NOT NULL,
  amount_ht NUMERIC(12,2),
  amount_ttc NUMERIC(12,2),
  tva_rate NUMERIC(5,2),
  currency TEXT NOT NULL DEFAULT 'CHF',
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'received',
  submitted_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  analysis_result JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. renovation_quote_items
CREATE TABLE public.renovation_quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.renovation_quotes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  designation TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,3),
  unit TEXT,
  unit_price NUMERIC(12,2),
  total_price NUMERIC(12,2),
  tva_rate NUMERIC(5,2),
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. renovation_budget_lines
CREATE TABLE public.renovation_budget_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  estimated NUMERIC(12,2) NOT NULL DEFAULT 0,
  committed NUMERIC(12,2) NOT NULL DEFAULT 0,
  invoiced NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance NUMERIC(12,2) GENERATED ALWAYS AS (estimated - committed) STORED,
  currency TEXT NOT NULL DEFAULT 'CHF',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. renovation_milestones
CREATE TABLE public.renovation_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  planned_date DATE,
  actual_date DATE,
  status public.renovation_task_status NOT NULL DEFAULT 'pending',
  weight NUMERIC(3,2) DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. renovation_tasks
CREATE TABLE public.renovation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.renovation_milestones(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.renovation_companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.renovation_task_status NOT NULL DEFAULT 'pending',
  priority public.renovation_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. renovation_updates
CREATE TABLE public.renovation_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'progress',
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. renovation_incidents
CREATE TABLE public.renovation_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.renovation_companies(id),
  title TEXT NOT NULL,
  description TEXT,
  severity public.renovation_incident_severity NOT NULL DEFAULT 'medium',
  status public.renovation_incident_status NOT NULL DEFAULT 'reported',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. renovation_permits
CREATE TABLE public.renovation_permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  permit_type TEXT NOT NULL,
  reference TEXT,
  issuing_authority TEXT,
  submitted_at DATE,
  approved_at DATE,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  document_file_id UUID REFERENCES public.renovation_project_files(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. renovation_warranties
CREATE TABLE public.renovation_warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.renovation_companies(id),
  warranty_type TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,
  document_file_id UUID REFERENCES public.renovation_project_files(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. renovation_reservations
CREATE TABLE public.renovation_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.renovation_companies(id),
  description TEXT NOT NULL,
  location TEXT,
  status public.renovation_reservation_status NOT NULL DEFAULT 'identified',
  severity public.renovation_incident_severity NOT NULL DEFAULT 'medium',
  deadline DATE,
  resolved_at TIMESTAMPTZ,
  photos TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. renovation_ai_alerts (données sensibles)
CREATE TABLE public.renovation_ai_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  alert_type public.renovation_alert_type NOT NULL,
  severity public.renovation_alert_severity NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. renovation_notifications_queue
CREATE TABLE public.renovation_notifications_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id),
  channel TEXT NOT NULL DEFAULT 'in_app',
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. renovation_audit_logs (données sensibles)
CREATE TABLE public.renovation_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES (~30)
-- ============================================================
CREATE INDEX idx_renovation_companies_status ON public.renovation_companies(status);
CREATE INDEX idx_renovation_company_users_company ON public.renovation_company_users(company_id);
CREATE INDEX idx_renovation_company_users_user ON public.renovation_company_users(user_id);
CREATE INDEX idx_renovation_project_companies_project ON public.renovation_project_companies(project_id);
CREATE INDEX idx_renovation_project_companies_company ON public.renovation_project_companies(company_id);
CREATE INDEX idx_renovation_company_scores_project ON public.renovation_company_scores(project_id);
CREATE INDEX idx_renovation_company_scores_company ON public.renovation_company_scores(company_id);
CREATE INDEX idx_renovation_quotes_project ON public.renovation_quotes(project_id);
CREATE INDEX idx_renovation_quotes_company ON public.renovation_quotes(company_id);
CREATE INDEX idx_renovation_quotes_status ON public.renovation_quotes(status);
CREATE INDEX idx_renovation_quote_items_quote ON public.renovation_quote_items(quote_id);
CREATE INDEX idx_renovation_budget_lines_project ON public.renovation_budget_lines(project_id);
CREATE INDEX idx_renovation_milestones_project ON public.renovation_milestones(project_id);
CREATE INDEX idx_renovation_milestones_status ON public.renovation_milestones(status);
CREATE INDEX idx_renovation_tasks_project ON public.renovation_tasks(project_id);
CREATE INDEX idx_renovation_tasks_company ON public.renovation_tasks(company_id);
CREATE INDEX idx_renovation_tasks_status ON public.renovation_tasks(status);
CREATE INDEX idx_renovation_tasks_assigned ON public.renovation_tasks(assigned_to);
CREATE INDEX idx_renovation_updates_project ON public.renovation_updates(project_id);
CREATE INDEX idx_renovation_incidents_project ON public.renovation_incidents(project_id);
CREATE INDEX idx_renovation_incidents_status ON public.renovation_incidents(status);
CREATE INDEX idx_renovation_permits_project ON public.renovation_permits(project_id);
CREATE INDEX idx_renovation_warranties_project ON public.renovation_warranties(project_id);
CREATE INDEX idx_renovation_warranties_company ON public.renovation_warranties(company_id);
CREATE INDEX idx_renovation_reservations_project ON public.renovation_reservations(project_id);
CREATE INDEX idx_renovation_reservations_company ON public.renovation_reservations(company_id);
CREATE INDEX idx_renovation_ai_alerts_project ON public.renovation_ai_alerts(project_id);
CREATE INDEX idx_renovation_ai_alerts_type ON public.renovation_ai_alerts(alert_type);
CREATE INDEX idx_renovation_notifications_recipient ON public.renovation_notifications_queue(recipient_user_id);
CREATE INDEX idx_renovation_notifications_status ON public.renovation_notifications_queue(status);
CREATE INDEX idx_renovation_audit_logs_project ON public.renovation_audit_logs(project_id);
CREATE INDEX idx_renovation_audit_logs_user ON public.renovation_audit_logs(user_id);