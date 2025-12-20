import { supabase } from "@/integrations/supabase/client";

/**
 * Extract the storage path from a Supabase storage URL
 * Handles full URLs, relative paths, and data URLs
 */
export const getStoragePath = (url: string): string => {
  if (!url) return '';
  
  // If it's a data URL, return as-is
  if (url.startsWith('data:')) return url;
  
  // If it's already a relative path (e.g., mandat/xxx.pdf or user_id/xxx.pdf)
  if (!url.includes('://')) return url;
  
  // If it's a full Supabase URL with /client-documents/
  if (url.includes('/client-documents/')) {
    const parts = url.split('/client-documents/');
    return parts[1] || url;
  }
  
  // If it's a full Supabase URL with /storage/v1/object/
  if (url.includes('/storage/v1/object/')) {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return url;
};

/**
 * Get a signed download URL for a document stored in Supabase Storage
 */
export const getDocumentDownloadUrl = async (
  documentUrl: string,
  bucketName: string = 'client-documents'
): Promise<string | null> => {
  if (!documentUrl) return null;
  
  // If it's a data URL, return as-is
  if (documentUrl.startsWith('data:')) return documentUrl;
  
  const storagePath = getStoragePath(documentUrl);
  
  // If it's still a data URL after processing, return as-is
  if (storagePath.startsWith('data:')) return storagePath;
  
  // Remove bucket name from path if present
  const cleanPath = storagePath.startsWith(`${bucketName}/`) 
    ? storagePath.replace(`${bucketName}/`, '') 
    : storagePath;
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(cleanPath, 3600); // 1 hour expiry
  
  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  
  return data?.signedUrl || null;
};

/**
 * Extract the document name from a URL or path
 */
export const extractDocumentName = (url: string): string => {
  if (!url) return '';
  
  // For data URLs, we can't extract a meaningful name
  if (url.startsWith('data:')) return 'document';
  
  // Get the last part of the path
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  
  // Remove query parameters
  const nameWithoutQuery = fileName.split('?')[0];
  
  // Try to decode URI component
  try {
    return decodeURIComponent(nameWithoutQuery);
  } catch {
    return nameWithoutQuery;
  }
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Check if a URL is a base64 data URL
 */
export const isDataUrl = (url: string): boolean => {
  return url?.startsWith('data:') || false;
};

/**
 * Get the MIME type from a data URL
 */
export const getMimeTypeFromDataUrl = (dataUrl: string): string | null => {
  if (!dataUrl.startsWith('data:')) return null;
  
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match ? match[1] : null;
};
