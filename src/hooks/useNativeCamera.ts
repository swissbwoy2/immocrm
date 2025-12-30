import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

interface UseNativeCameraResult {
  takePhoto: () => Promise<File | null>;
  pickFromGallery: () => Promise<File | null>;
  isNative: boolean;
  loading: boolean;
  error: string | null;
}

// Convert base64 to File
const base64ToFile = async (base64: string, filename: string, mimeType: string): Promise<File> => {
  const res = await fetch(`data:${mimeType};base64,${base64}`);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType });
};

// Convert webPath to File
const webPathToFile = async (webPath: string, filename: string): Promise<File> => {
  const response = await fetch(webPath);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

export function useNativeCamera(): UseNativeCameraResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isNative = Capacitor.isNativePlatform();

  const processPhoto = async (photo: Photo): Promise<File | null> => {
    const timestamp = Date.now();
    const filename = `photo_${timestamp}.${photo.format || 'jpeg'}`;
    const mimeType = `image/${photo.format || 'jpeg'}`;

    if (photo.base64String) {
      return base64ToFile(photo.base64String, filename, mimeType);
    } else if (photo.webPath) {
      return webPathToFile(photo.webPath, filename);
    }
    return null;
  };

  const takePhoto = useCallback(async (): Promise<File | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Request permissions first on native
      if (isNative) {
        const permissions = await Camera.checkPermissions();
        if (permissions.camera !== 'granted') {
          const requestResult = await Camera.requestPermissions({ permissions: ['camera'] });
          if (requestResult.camera !== 'granted') {
            setError('Permission caméra refusée');
            return null;
          }
        }
      }

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
      });

      return await processPhoto(photo);
    } catch (err: any) {
      // User cancelled is not an error
      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
        return null;
      }
      console.error('Camera error:', err);
      setError(err.message || 'Erreur lors de la capture photo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isNative]);

  const pickFromGallery = useCallback(async (): Promise<File | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Request permissions first on native
      if (isNative) {
        const permissions = await Camera.checkPermissions();
        if (permissions.photos !== 'granted') {
          const requestResult = await Camera.requestPermissions({ permissions: ['photos'] });
          if (requestResult.photos !== 'granted') {
            setError('Permission photos refusée');
            return null;
          }
        }
      }

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        correctOrientation: true,
      });

      return await processPhoto(photo);
    } catch (err: any) {
      // User cancelled is not an error
      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
        return null;
      }
      console.error('Gallery error:', err);
      setError(err.message || 'Erreur lors de la sélection photo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isNative]);

  return {
    takePhoto,
    pickFromGallery,
    isNative,
    loading,
    error,
  };
}
