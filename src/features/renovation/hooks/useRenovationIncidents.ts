import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRenovationIncidents(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['renovation-incidents', projectId];

  const incidents = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renovation_incidents')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      severity: string;
      is_blocking?: boolean;
      cost_impact?: number;
      delay_impact_days?: number;
      company_id?: string;
      milestone_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('renovation_incidents')
        .insert([{ ...payload, project_id: projectId!, status: 'reported' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Incident créé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('renovation_incidents')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Incident mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { incidents, create, update };
}
