-- ============================================================
-- RÉNOVATION INTELLIGENTE — MIGRATION 1 : ENUMS + TABLES CŒUR
-- ============================================================

-- 11 Enums
CREATE TYPE public.renovation_project_status AS ENUM (
  'draft', 'planning', 'quoting', 'approved', 'in_progress',
  'on_hold', 'completed', 'cancelled', 'archived'
);

CREATE TYPE public.renovation_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE public.renovation_file_category AS ENUM (
  'photo_before', 'photo_during', 'photo_after',
  'quote', 'invoice', 'contract', 'permit',
  'plan', 'diagnostic', 'technical_report',
  'insurance', 'warranty', 'other'
);

CREATE TYPE public.renovation_task_status AS ENUM (
  'pending', 'in_progress', 'completed', 'blocked', 'cancelled'
);

CREATE TYPE public.renovation_incident_severity AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE public.renovation_incident_status AS ENUM (
  'reported', 'acknowledged', 'in_progress', 'resolved', 'closed'
);

CREATE TYPE public.renovation_alert_severity AS ENUM (
  'info', 'warning', 'error', 'critical'
);

CREATE TYPE public.renovation_alert_type AS ENUM (
  'budget_overrun', 'schedule_delay', 'missing_document',
  'warranty_expiring', 'invoice_mismatch', 'quality_issue',
  'permit_expiring', 'milestone_overdue'
);

CREATE TYPE public.renovation_company_role AS ENUM (
  'general_contractor', 'subcontractor', 'architect',
  'engineer', 'inspector', 'consultant', 'supplier'
);

CREATE TYPE public.renovation_job_status AS ENUM (
  'queued', 'processing', 'completed', 'failed'
);

CREATE TYPE public.renovation_reservation_status AS ENUM (
  'identified', 'notified', 'in_progress', 'resolved', 'disputed'
);

-- ============================================================
-- TABLE 1 : renovation_projects
-- ============================================================
CREATE TABLE public.renovation_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  immeuble_id UUID NOT NULL REFERENCES public.immeubles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL DEFAULT 'renovation',
  status public.renovation_project_status NOT NULL DEFAULT 'draft',
  priority public.renovation_priority NOT NULL DEFAULT 'medium',
  start_date_planned DATE,
  end_date_planned DATE,
  start_date_actual DATE,
  end_date_actual DATE,
  budget_estimated NUMERIC(12,2),
  budget_actual NUMERIC(12,2) DEFAULT 0,
  quality_target TEXT,
  timeline_constraint TEXT,
  risk_notes TEXT,
  objective TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 2 : renovation_project_members
-- ============================================================
CREATE TABLE public.renovation_project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL DEFAULT 'viewer',
  can_validate BOOLEAN NOT NULL DEFAULT false,
  can_manage_budget BOOLEAN NOT NULL DEFAULT false,
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ============================================================
-- TABLE 3 : renovation_project_files
-- ============================================================
CREATE TABLE public.renovation_project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  category public.renovation_file_category NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  file_hash TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  tags TEXT[],
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 4 : renovation_analysis_jobs
-- ============================================================
CREATE TABLE public.renovation_analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.renovation_project_files(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  status public.renovation_job_status NOT NULL DEFAULT 'queued',
  analysis_type TEXT NOT NULL DEFAULT 'document_summary',
  result JSONB,
  last_error TEXT,
  locked_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 5 : renovation_project_internal_notes
-- ============================================================
CREATE TABLE public.renovation_project_internal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.renovation_projects(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id),
  note_type TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for core tables
CREATE INDEX idx_renovation_projects_immeuble ON public.renovation_projects(immeuble_id);
CREATE INDEX idx_renovation_projects_status ON public.renovation_projects(status);
CREATE INDEX idx_renovation_project_members_project ON public.renovation_project_members(project_id);
CREATE INDEX idx_renovation_project_members_user ON public.renovation_project_members(user_id);
CREATE INDEX idx_renovation_project_files_project ON public.renovation_project_files(project_id);
CREATE INDEX idx_renovation_project_files_category ON public.renovation_project_files(category);
CREATE INDEX idx_renovation_analysis_jobs_file ON public.renovation_analysis_jobs(file_id);
CREATE INDEX idx_renovation_analysis_jobs_status ON public.renovation_analysis_jobs(status);
CREATE INDEX idx_renovation_internal_notes_project ON public.renovation_project_internal_notes(project_id);