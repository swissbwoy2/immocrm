import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRenovationWarranties(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['renovation-warranties', projectId];

  const warranties = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renovation_warranties')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (payload: {
      warranty_type?: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      duration_months?: number;
      company_id?: string;
      category?: string;
      equipment?: string;
      brand?: string;
      model?: string;
      serial_number?: string;
      installation_date?: string;
      maintenance_frequency?: string;
    }) => {
      const { data, error } = await supabase
        .from('renovation_warranties')
        .insert({ ...payload, project_id: projectId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Garantie créée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('renovation_warranties')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Garantie mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { warranties, create, update };
}
