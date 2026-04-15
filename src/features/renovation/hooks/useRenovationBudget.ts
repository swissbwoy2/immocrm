import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRenovationBudget(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const budgetQuery = useQuery({
    queryKey: ['renovation-budget', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('renovation_budget_lines')
        .select('*')
        .eq('project_id', projectId)
        .order('category');

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const updateLineMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('renovation_budget_lines')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovation-budget', projectId] });
      toast.success('Budget mis à jour');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    budget: budgetQuery,
    updateLine: updateLineMutation,
  };
}
