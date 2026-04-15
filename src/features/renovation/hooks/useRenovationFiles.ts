import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RenovationProjectFile, RenovationAnalysisJob, RenovationFileCategory } from '../types/renovation';
import { uploadRenovationFile } from '../api/uploadFile';
import { retryAnalysis } from '../api/analyzeFile';
import { toast } from 'sonner';

export function useRenovationFiles(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const filesQuery = useQuery({
    queryKey: ['renovation-files', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('renovation_project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as RenovationProjectFile[];
    },
    enabled: !!projectId,
  });

  const jobsQuery = useQuery({
    queryKey: ['renovation-jobs', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('renovation_analysis_jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as RenovationAnalysisJob[];
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const jobs = query.state.data;
      const hasProcessing = jobs?.some(j => j.status === 'queued' || j.status === 'processing');
      return hasProcessing ? 3000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category, tags }: { file: File; category: RenovationFileCategory; tags?: string[] }) => {
      if (!projectId) throw new Error('No project ID');
      return uploadRenovationFile({ projectId, file, category, tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovation-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['renovation-jobs', projectId] });
      toast.success('Fichier uploadé avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur d'upload: ${error.message}`);
    },
  });

  const retryMutation = useMutation({
    mutationFn: async ({ jobId, force }: { jobId: string; force?: boolean }) => {
      return retryAnalysis(jobId, force);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovation-jobs', projectId] });
      toast.success('Analyse relancée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    files: filesQuery,
    jobs: jobsQuery,
    upload: uploadMutation,
    retry: retryMutation,
  };
}
