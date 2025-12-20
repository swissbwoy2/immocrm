import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleMapsLoaderState {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  isFallback: boolean;
}

// Track global loading state to prevent multiple script loads
let globalLoadingPromise: Promise<void> | null = null;
let isGloballyLoaded = false;

const LOAD_TIMEOUT_MS = 5000; // 5 second timeout

export function useGoogleMapsLoader() {
  const [state, setState] = useState<GoogleMapsLoaderState>({
    isLoaded: isGloballyLoaded,
    isLoading: !isGloballyLoaded,
    error: null,
    token: null,
    isFallback: false,
  });

  const loadScript = useCallback(async (apiKey: string): Promise<void> => {
    // If already loaded, return immediately
    if (window.google?.maps) {
      isGloballyLoaded = true;
      setState(prev => ({ ...prev, isLoaded: true, isLoading: false, isFallback: false }));
      return;
    }

    // If already loading, wait for that promise
    if (globalLoadingPromise) {
      await globalLoadingPromise;
      setState(prev => ({ ...prev, isLoaded: true, isLoading: false, isFallback: false }));
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
    setState(prev => ({ ...prev, isLoaded: true, isLoading: false, isFallback: false }));
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    async function init() {
      // If already loaded, skip
      if (isGloballyLoaded && window.google?.maps) {
        setState(prev => ({ ...prev, isLoaded: true, isLoading: false, isFallback: false }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      // Set timeout for fallback mode
      timeoutId = setTimeout(() => {
        if (mounted && !isGloballyLoaded) {
          console.warn('Google Maps loading timeout - switching to fallback mode');
          setState(prev => ({
            ...prev,
            isLoading: false,
            isFallback: true,
            error: null,
          }));
        }
      }, LOAD_TIMEOUT_MS);

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
          
          // Clear timeout if successful
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        if (mounted) {
          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          // Go to fallback mode instead of error state
          setState(prev => ({
            ...prev,
            isLoading: false,
            isFallback: true,
            error: null, // Don't show error, just use fallback
          }));
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadScript]);

  return state;
}

export default useGoogleMapsLoader;
