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

const LOAD_TIMEOUT_MS = 15000; // 15 second timeout (increased from 5s)
const EDGE_FUNCTION_TIMEOUT_MS = 8000; // 8 seconds for Edge Function

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
      console.log('[GoogleMaps] Already loaded globally');
      isGloballyLoaded = true;
      setState(prev => ({ ...prev, isLoaded: true, isLoading: false, isFallback: false }));
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('[GoogleMaps] Script already in DOM, waiting for load...');
      await new Promise<void>((resolve) => {
        if (window.google?.maps) {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve());
          // Also set a timeout in case the script is stuck
          setTimeout(() => resolve(), 5000);
        }
      });
      
      if (window.google?.maps) {
        console.log('[GoogleMaps] Existing script loaded successfully');
        isGloballyLoaded = true;
        setState(prev => ({ ...prev, isLoaded: true, isLoading: false, isFallback: false }));
        return;
      }
    }

    // If already loading, wait for that promise
    if (globalLoadingPromise) {
      console.log('[GoogleMaps] Already loading, waiting for promise...');
      await globalLoadingPromise;
      setState(prev => ({ ...prev, isLoaded: true, isLoading: false, isFallback: false }));
      return;
    }

    // Start loading
    console.log('[GoogleMaps] Starting script load...');
    globalLoadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&language=fr&region=CH`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('[GoogleMaps] Script loaded successfully');
        isGloballyLoaded = true;
        resolve();
      };

      script.onerror = () => {
        console.error('[GoogleMaps] Failed to load script');
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
        console.log('[GoogleMaps] Already initialized');
        setState(prev => ({ ...prev, isLoaded: true, isLoading: false, isFallback: false }));
        return;
      }

      console.log('[GoogleMaps] Starting initialization...');
      setState(prev => ({ ...prev, isLoading: true }));

      // Set timeout for fallback mode
      timeoutId = setTimeout(() => {
        if (mounted && !isGloballyLoaded) {
          console.warn('[GoogleMaps] Timeout reached after', LOAD_TIMEOUT_MS, 'ms - switching to fallback mode');
          setState(prev => ({
            ...prev,
            isLoading: false,
            isFallback: true,
            error: null,
          }));
        }
      }, LOAD_TIMEOUT_MS);

      try {
        // Fetch the API key from edge function with specific timeout
        console.log('[GoogleMaps] Fetching token from Edge Function...');
        
        const controller = new AbortController();
        const edgeFunctionTimeoutId = setTimeout(() => {
          console.warn('[GoogleMaps] Edge Function timeout after', EDGE_FUNCTION_TIMEOUT_MS, 'ms');
          controller.abort();
        }, EDGE_FUNCTION_TIMEOUT_MS);

        let data, error;
        try {
          const response = await supabase.functions.invoke('get-google-maps-token');
          data = response.data;
          error = response.error;
          clearTimeout(edgeFunctionTimeoutId);
        } catch (fetchError) {
          clearTimeout(edgeFunctionTimeoutId);
          throw fetchError;
        }

        if (error) throw error;

        if (!data?.token) {
          throw new Error('Google Maps token not configured');
        }

        console.log('[GoogleMaps] Token retrieved successfully');

        if (mounted) {
          setState(prev => ({ ...prev, token: data.token }));
          await loadScript(data.token);
          
          // Clear timeout if successful
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          console.log('[GoogleMaps] Initialization complete');
        }
      } catch (err) {
        console.error('[GoogleMaps] Error during initialization:', err);
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
