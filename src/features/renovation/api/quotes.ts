import { supabase } from '@/integrations/supabase/client';

export async function createRenovationQuote(payload: {
  projectId: string;
  companyId: string;
  title: string;
  fileId?: string;
  reference?: string;
  notes?: string;
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const response = await supabase.functions.invoke('renovation-create-quote', {
    body: payload,
  });

  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data.id;
}

export async function analyzeRenovationQuote(quoteId: string) {
  const response = await supabase.functions.invoke('renovation-analyze-quote', {
    body: { quoteId },
  });

  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}

export async function compareRenovationQuotes(projectId: string, quoteIds: string[]) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const response = await supabase.functions.invoke('renovation-compare-quotes', {
    body: { projectId, quoteIds },
  });

  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}
