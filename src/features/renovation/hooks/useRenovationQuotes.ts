import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createRenovationQuote, analyzeRenovationQuote, compareRenovationQuotes } from '../api/quotes';
import { toast } from 'sonner';

export function useRenovationQuotes(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const quotesQuery = useQuery({
    queryKey: ['renovation-quotes', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('renovation_quotes')
        .select('*, renovation_companies(name), renovation_quote_items(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: createRenovationQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovation-quotes', projectId] });
      toast.success('Devis créé');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const analyzeMutation = useMutation({
    mutationFn: analyzeRenovationQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovation-quotes', projectId] });
      toast.success('Analyse terminée');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const compareMutation = useMutation({
    mutationFn: ({ quoteIds }: { quoteIds: string[] }) =>
      compareRenovationQuotes(projectId!, quoteIds),
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    quotes: quotesQuery,
    createQuote: createMutation,
    analyzeQuote: analyzeMutation,
    compareQuotes: compareMutation,
  };
}
