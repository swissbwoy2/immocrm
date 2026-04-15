export type RenovationProjectStatus =
  | 'draft' | 'planning' | 'quoting' | 'approved' | 'in_progress'
  | 'on_hold' | 'completed' | 'cancelled' | 'archived' | 'closed';

export type RenovationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RenovationFileCategory =
  | 'photo_before' | 'photo_during' | 'photo_after'
  | 'quote' | 'invoice' | 'contract' | 'permit'
  | 'plan' | 'diagnostic' | 'technical_report'
  | 'insurance' | 'warranty' | 'other';

export type RenovationJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type RenovationIncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RenovationIncidentStatus = 'reported' | 'in_progress' | 'resolved' | 'closed';

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
  closed_at: string | null;
  closed_by: string | null;
  final_report_path: string | null;
  warranties_not_applicable: boolean;
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

export interface RenovationIncident {
  id: string;
  project_id: string;
  reported_by: string | null;
  company_id: string | null;
  title: string;
  description: string | null;
  severity: RenovationIncidentSeverity;
  status: RenovationIncidentStatus;
  resolution: string | null;
  resolved_at: string | null;
  milestone_id: string | null;
  assigned_to: string | null;
  cost_impact: number | null;
  delay_impact_days: number | null;
  is_blocking: boolean;
  created_at: string;
  updated_at: string;
}

export interface RenovationReservation {
  id: string;
  project_id: string;
  company_id: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  status: string;
  severity: string | null;
  deadline: string | null;
  resolved_at: string | null;
  photos: string[] | null;
  notes: string | null;
  milestone_id: string | null;
  reported_by: string | null;
  is_blocking: boolean;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationWarranty {
  id: string;
  project_id: string;
  company_id: string | null;
  warranty_type: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  document_file_id: string | null;
  notes: string | null;
  category: string | null;
  equipment: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  installation_date: string | null;
  maintenance_frequency: string | null;
  invoice_file_id: string | null;
  notice_file_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationAlert {
  id: string;
  project_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  data: Record<string, any> | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  idempotency_key: string | null;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
}

export interface RenovationHistoryEntry {
  id: string;
  project_id: string;
  user_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  created_at: string;
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
