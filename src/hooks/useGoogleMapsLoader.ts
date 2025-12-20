import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleMapsLoaderState {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

// Track global loading state to prevent multiple script loads
let globalLoadingPromise: Promise<void> | null = null;
let isGloballyLoaded = false;

export function useGoogleMapsLoader() {
  const [state, setState] = useState<GoogleMapsLoaderState>({
    isLoaded: isGloballyLoaded,
    isLoading: false,
    error: null,
    token: null,
  });

  const loadScript = useCallback(async (apiKey: string): Promise<void> => {
    // If already loaded, return immediately
    if (window.google?.maps) {
      isGloballyLoaded = true;
      setState(prev => ({ ...prev, isLoaded: true, isLoading: false }));
      return;
    }

    // If already loading, wait for that promise
    if (globalLoadingPromise) {
      await globalLoadingPromise;
      setState(prev => ({ ...prev, isLoaded: true, isLoading: false }));
      return;
    }

    // Start loading
    globalLoadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=fr&region=CH`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        isGloballyLoaded = true;
        resolve();
      };

      script.onerror = () => {
        globalLoadingPromise = null;
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });

    await globalLoadingPromise;
    setState(prev => ({ ...prev, isLoaded: true, isLoading: false }));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // If already loaded, skip
      if (isGloballyLoaded && window.google?.maps) {
        setState(prev => ({ ...prev, isLoaded: true }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      try {
        // Fetch the API key from edge function
        const { data, error } = await supabase.functions.invoke('get-google-maps-token');

        if (error) throw error;

        if (!data?.token) {
          throw new Error('Google Maps token not configured');
        }

        if (mounted) {
          setState(prev => ({ ...prev, token: data.token }));
          await loadScript(data.token);
        }
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        if (mounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load Google Maps',
          }));
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [loadScript]);

  return state;
}

export default useGoogleMapsLoader;
