import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RenovationProject, RenovationMilestone } from '../types/renovation';

export function useRenovationProject(projectId: string | undefined) {
  const projectQuery = useQuery({
    queryKey: ['renovation-project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('renovation_projects')
        .select('*, immeubles(nom, adresse)')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as unknown as RenovationProject;
    },
    enabled: !!projectId,
  });

  const milestonesQuery = useQuery({
    queryKey: ['renovation-milestones', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('renovation_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as RenovationMilestone[];
    },
    enabled: !!projectId,
  });

  return { project: projectQuery, milestones: milestonesQuery };
}
