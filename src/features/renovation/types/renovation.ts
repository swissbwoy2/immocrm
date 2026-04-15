export type RenovationProjectStatus =
  | 'draft' | 'planning' | 'quoting' | 'approved' | 'in_progress'
  | 'on_hold' | 'completed' | 'cancelled' | 'archived';

export type RenovationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RenovationFileCategory =
  | 'photo_before' | 'photo_during' | 'photo_after'
  | 'quote' | 'invoice' | 'contract' | 'permit'
  | 'plan' | 'diagnostic' | 'technical_report'
  | 'insurance' | 'warranty' | 'other';

export type RenovationJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface RenovationProject {
  id: string;
  immeuble_id: string;
  title: string;
  description: string | null;
  project_type: string;
  status: RenovationProjectStatus;
  priority: RenovationPriority;
  start_date_planned: string | null;
  end_date_planned: string | null;
  start_date_actual: string | null;
  end_date_actual: string | null;
  budget_estimated: number | null;
  budget_actual: number | null;
  quality_target: string | null;
  timeline_constraint: string | null;
  risk_notes: string | null;
  objective: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  immeubles?: { nom: string; adresse: string } | null;
}

export interface RenovationProjectFile {
  id: string;
  project_id: string;
  category: RenovationFileCategory;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  file_hash: string | null;
  version: number;
  tags: string[] | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationAnalysisJob {
  id: string;
  file_id: string;
  project_id: string;
  status: RenovationJobStatus;
  analysis_type: string;
  result: Record<string, any> | null;
  last_error: string | null;
  locked_at: string | null;
  attempts: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  planned_date: string | null;
  actual_date: string | null;
  status: string;
  weight: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  immeuble_id: string;
  title: string;
  description?: string;
  project_type?: string;
  priority?: RenovationPriority;
  start_date_planned?: string;
  end_date_planned?: string;
  budget_estimated?: number;
}
