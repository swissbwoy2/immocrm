import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { scoreRenovationCompany } from '../api/progress';
import { toast } from 'sonner';

export function useRenovationCompanies(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const companiesQuery = useQuery({
    queryKey: ['renovation-companies', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('renovation_project_companies')
        .select('*, renovation_companies(id, name, contact_name, contact_email, contact_phone, city)')
        .eq('project_id', projectId)
        .order('created_at');

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const allCompaniesQuery = useQuery({
    queryKey: ['renovation-all-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renovation_companies')
        .select('id, name, city, specialties')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const addCompanyMutation = useMutation({
    mutationFn: async ({ companyId, role, lotName }: { companyId: string; role?: string; lotName?: string }) => {
      const { error } = await supabase
        .from('renovation_project_companies')
        .insert({
          project_id: projectId!,
          company_id: companyId,
          role: (role || 'contractor') as any,
          lot_name: lotName || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovation-companies', projectId] });
      toast.success('Entreprise ajoutée');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const scoreMutation = useMutation({
    mutationFn: ({ companyId }: { companyId: string }) =>
      scoreRenovationCompany(projectId!, companyId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['renovation-companies', projectId] });
      if (data.score !== null) {
        toast.success(`Score: ${data.score}/100`);
      } else {
        toast.info(data.message);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    companies: companiesQuery,
    allCompanies: allCompaniesQuery,
    addCompany: addCompanyMutation,
    scoreCompany: scoreMutation,
  };
}
