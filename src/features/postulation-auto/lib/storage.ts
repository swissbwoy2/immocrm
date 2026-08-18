import { supabase } from '@/integrations/supabase/client';

export const FORM_BUCKET = 'formulaires-location';
export const SIGN_BUCKET = 'agent-signatures';

export async function signedUrl(bucket: string, path: string, expires = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function fetchBytes(bucket: string, path?: string | null): Promise<Uint8Array | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function uploadPdf(path: string, file: File | Blob): Promise<string | null> {
  const { error } = await supabase.storage.from(FORM_BUCKET).upload(path, file, {
    upsert: true,
    contentType: 'application/pdf',
  });
  if (error) return null;
  return path;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
