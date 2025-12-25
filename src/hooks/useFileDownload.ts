import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface DownloadOptions {
  filename: string;
  mimeType?: string;
}

interface DownloadResult {
  success: boolean;
  error?: string;
}

export function useFileDownload() {
  const isNative = Capacitor.isNativePlatform();

  const downloadFromUrl = useCallback(async (
    url: string,
    options: DownloadOptions
  ): Promise<DownloadResult> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      return downloadBytes(bytes, options);
    } catch (error) {
      console.error('Download from URL error:', error);
      return { success: false, error: String(error) };
    }
  }, []);

  const downloadBytes = useCallback(async (
    bytes: Uint8Array,
    options: DownloadOptions
  ): Promise<DownloadResult> => {
    const { filename, mimeType = 'application/octet-stream' } = options;

    try {
      if (isNative) {
        // Native iOS/Android: use Capacitor Filesystem + Share
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        // Convert bytes to base64
        const base64 = btoa(
          bytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Write file to cache directory
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        });

        console.log('File written to:', result.uri);

        // Share/open the file
        await Share.share({
          title: filename,
          url: result.uri,
          dialogTitle: 'Télécharger le fichier',
        });

        return { success: true };
      } else {
        // Web: use blob download
        const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true };
      }
    } catch (error) {
      console.error('Download bytes error:', error);
      
      // Fallback for web if native fails
      if (isNative) {
        try {
          const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return { success: true };
        } catch (fallbackError) {
          console.error('Fallback download also failed:', fallbackError);
        }
      }
      
      return { success: false, error: String(error) };
    }
  }, [isNative]);

  const downloadBlob = useCallback(async (
    blob: Blob,
    options: DownloadOptions
  ): Promise<DownloadResult> => {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    return downloadBytes(bytes, { ...options, mimeType: blob.type || options.mimeType });
  }, [downloadBytes]);

  return {
    downloadFromUrl,
    downloadBytes,
    downloadBlob,
    isNative,
  };
}
