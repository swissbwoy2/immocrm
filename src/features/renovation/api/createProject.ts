import { supabase } from '@/integrations/supabase/client';
import { CreateProjectPayload } from '../types/renovation';

export async function createRenovationProject(payload: CreateProjectPayload): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const response = await supabase.functions.invoke('renovation-create-project', {
    body: payload,
  });

  if (response.error) throw new Error(response.error.message);
  return response.data.id;
}
