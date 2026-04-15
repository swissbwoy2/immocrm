import { supabase } from '@/integrations/supabase/client';
import { RenovationFileCategory } from '../types/renovation';

interface UploadFileParams {
  projectId: string;
  file: File;
  category: RenovationFileCategory;
  tags?: string[];
}

export async function uploadRenovationFile({ projectId, file, category, tags }: UploadFileParams) {
  // Step 1: Get signed upload URL
  const { data: uploadData, error: uploadError } = await supabase.functions.invoke('renovation-create-upload', {
    body: {
      projectId,
      fileName: file.name,
      category,
      mimeType: file.type,
    },
  });

  if (uploadError) throw new Error(uploadError.message);

  // Step 2: Upload file to storage using signed URL
  const { error: storageError } = await supabase.storage
    .from('renovation-private')
    .uploadToSignedUrl(uploadData.storagePath, uploadData.token, file, {
      contentType: file.type,
    });

  if (storageError) throw new Error(storageError.message);

  // Step 3: Register upload and trigger analysis
  const { data: registerData, error: registerError } = await supabase.functions.invoke('renovation-register-upload', {
    body: {
      projectId,
      storagePath: uploadData.storagePath,
      fileName: file.name,
      category,
      mimeType: file.type,
      fileSize: file.size,
      tags,
    },
  });

  if (registerError) throw new Error(registerError.message);
  return registerData;
}
