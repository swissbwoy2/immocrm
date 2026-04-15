import { supabase } from '@/integrations/supabase/client';

export async function updateRenovationProgress(payload: {
  projectId: string;
  milestoneId?: string;
  taskId?: string;
  status: string;
  actualDate?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const response = await supabase.functions.invoke('renovation-update-progress', {
    body: payload,
  });

  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}

export async function scoreRenovationCompany(projectId: string, companyId: string) {
  const response = await supabase.functions.invoke('renovation-score-companies', {
    body: { projectId, companyId },
  });

  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}
