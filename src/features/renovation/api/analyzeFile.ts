import { supabase } from '@/integrations/supabase/client';

export async function retryAnalysis(jobId: string, force = false) {
  const { data, error } = await supabase.functions.invoke('renovation-analyze-file', {
    body: { jobId, force },
  });

  if (error) throw new Error(error.message);
  return data;
}
