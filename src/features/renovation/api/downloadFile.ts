import { supabase } from '@/integrations/supabase/client';

export async function downloadRenovationFile(fileId: string) {
  const { data, error } = await supabase.functions.invoke('renovation-download-file', {
    body: { fileId },
  });

  if (error) throw new Error(error.message);
  return data as { signedUrl: string; fileName: string; mimeType: string; expiresAt: string };
}
