import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RenovationHistoryEntry } from '../types/renovation';

export function useRenovationHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ['renovation-history', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<{ entries: RenovationHistoryEntry[]; total: number }> => {
      const { data, error } = await supabase.functions.invoke('renovation-get-history', {
        body: { projectId, limit: 100, offset: 0 },
      });
      if (error) throw error;
      return data as { entries: RenovationHistoryEntry[]; total: number };
    },
  });
}
