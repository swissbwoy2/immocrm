import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RenovationProject } from '../types/renovation';

export function useRenovationProjects() {
  return useQuery({
    queryKey: ['renovation-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renovation_projects')
        .select('*, immeubles(nom, adresse)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as RenovationProject[];
    },
  });
}
