import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LoaderStage = 'idle' | 'token' | 'script' | 'ready' | 'fallback';
export type LoaderError = 
  | 'token_error' 
  | 'token_timeout' 
  | 'script_error' 
  | 'script_timeout' 
  | 'auth_failure' 
  | 'places_missing' 
  | null;

interface GoogleMapsLoaderState {
  isLoaded: boolean;
  isLoading: boolean;
  error: LoaderError;
  token: string | null;
  isFallback: boolean;
  stage: LoaderStage;
}

// Global state to track loading across all hook instances
let globalState: {
  isLoaded: boolean;
  isLoading: boolean;
  loadPromise: Promise<void> | null;
  retryCount: number;
  token: string | null;
} = {
  isLoaded: false,
  isLoading: false,
  loadPromise: null,
  retryCount: 0,
  token: null,
};

const SCRIPT_ID = 'google-maps-js';
const CALLBACK_NAME = '__googleMapsCallback';
const AUTH_FAILURE_HANDLER = 'gm_authFailure';
const TOKEN_TIMEOUT_MS = 10000;
const SCRIPT_TIMEOUT_MS = 20000;
const MAX_RETRIES = 1;

// Track auth failure globally
let authFailureDetected = false;

// Cleanup function for retry mechanism
function cleanupGoogleMaps() {
  // Remove existing script
  const existingScript = document.getElementById(SCRIPT_ID);
  if (existingScript) {
    existingScript.remove();
  }
  
  // Remove callback
  if ((window as any)[CALLBACK_NAME]) {
    delete (window as any)[CALLBACK_NAME];
  }
  
  // Reset global state but keep token
  globalState.isLoaded = false;
  globalState.isLoading = false;
  globalState.loadPromise = null;
}

// Export retry function for components to use
export function retryGoogleMapsLoader(): void {
  authFailureDetected = false;
  cleanupGoogleMaps();
  globalState.retryCount = 0;
  // Trigger re-render in all hooks by forcing state update
  window.dispatchEvent(new CustomEvent('googlemaps-retry'));
}

// Get diagnostic info for debugging
export function getGoogleMapsDiagnostic(): string {
  const info = {
    isLoaded: globalState.isLoaded,
    hasGoogleObject: !!window.google,
    hasGoogleMaps: !!window.google?.maps,
    hasPlaces: !!window.google?.maps?.places,
    scriptInDOM: !!document.getElementById(SCRIPT_ID),
    authFailure: authFailureDetected,
    retryCount: globalState.retryCount,
    userAgent: navigator.userAgent.substring(0, 100),
  };
  return JSON.stringify(info, null, 2);
}

export function useGoogleMapsLoader() {
  const [state, setState] = useState<GoogleMapsLoaderState>({
    isLoaded: globalState.isLoaded,
    isLoading: !globalState.isLoaded,
    error: null,
    token: globalState.token,
    isFallback: false,
    stage: globalState.isLoaded ? 'ready' : 'idle',
  });

  const mountedRef = useRef(true);
  const initStartedRef = useRef(false);

  const updateState = useCallback((updates: Partial<GoogleMapsLoaderState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const fetchToken = useCallback(async (): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('token_timeout'));
      }, TOKEN_TIMEOUT_MS);

      try {
        console.log('[GoogleMaps] Fetching token from Edge Function...');
        const { data, error } = await supabase.functions.invoke('get-google-maps-token');
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('[GoogleMaps] Token fetch error:', error);
          reject(new Error('token_error'));
          return;
        }

        if (!data?.token) {
          console.error('[GoogleMaps] No token in response');
          reject(new Error('token_error'));
          return;
        }

        console.log('[GoogleMaps] Token retrieved successfully');
        resolve(data.token);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('[GoogleMaps] Token fetch exception:', err);
        reject(new Error('token_error'));
      }
    });
  }, []);

  const loadScript = useCallback((apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google?.maps?.places) {
        console.log('[GoogleMaps] Already loaded (places available)');
        resolve();
        return;
      }

      // Setup auth failure handler BEFORE loading script
      (window as any)[AUTH_FAILURE_HANDLER] = () => {
        console.error('[GoogleMaps] Auth failure detected (API key restrictions)');
        authFailureDetected = true;
        reject(new Error('auth_failure'));
      };

      // Setup timeout
      const timeoutId = setTimeout(() => {
        console.error('[GoogleMaps] Script load timeout after', SCRIPT_TIMEOUT_MS, 'ms');
        reject(new Error('script_timeout'));
      }, SCRIPT_TIMEOUT_MS);

      // Setup callback that Google will call when ready
      (window as any)[CALLBACK_NAME] = () => {
        clearTimeout(timeoutId);
        console.log('[GoogleMaps] Callback fired, checking Places library...');
        
        // Verify Places library is available
        if (window.google?.maps?.places) {
          console.log('[GoogleMaps] Places library confirmed available');
          resolve();
        } else {
          console.error('[GoogleMaps] Places library NOT available after callback');
          reject(new Error('places_missing'));
        }
      };

      // Remove any existing script first
      const existingScript = document.getElementById(SCRIPT_ID);
      if (existingScript) {
        existingScript.remove();
      }

      // Create and inject script
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=fr&region=CH&callback=${CALLBACK_NAME}`;
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        clearTimeout(timeoutId);
        console.error('[GoogleMaps] Script failed to load (network/blocked)');
        reject(new Error('script_error'));
      };

      console.log('[GoogleMaps] Injecting script with callback...');
      document.head.appendChild(script);
    });
  }, []);

  const initialize = useCallback(async () => {
    // Already loaded
    if (globalState.isLoaded && window.google?.maps?.places) {
      updateState({
        isLoaded: true,
        isLoading: false,
        isFallback: false,
        stage: 'ready',
        error: null,
      });
      return;
    }

    // Already loading - wait for existing promise
    if (globalState.isLoading && globalState.loadPromise) {
      try {
        await globalState.loadPromise;
        updateState({
          isLoaded: true,
          isLoading: false,
          isFallback: false,
          stage: 'ready',
          error: null,
        });
      } catch {
        // Will be handled by the original loader
      }
      return;
    }

    // Start loading
    globalState.isLoading = true;
    updateState({ isLoading: true, stage: 'token' });

    const attemptLoad = async (): Promise<void> => {
      try {
        // Step 1: Get token
        updateState({ stage: 'token' });
        const token = await fetchToken();
        globalState.token = token;
        updateState({ token });

        // Step 2: Load script
        updateState({ stage: 'script' });
        await loadScript(token);

        // Success!
        globalState.isLoaded = true;
        globalState.isLoading = false;
        console.log('[GoogleMaps] ✅ Initialization complete');
        updateState({
          isLoaded: true,
          isLoading: false,
          isFallback: false,
          stage: 'ready',
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'unknown';
        console.error('[GoogleMaps] Load attempt failed:', errorMessage);

        // Determine error type
        let errorType: LoaderError = 'script_error';
        if (errorMessage === 'token_error') errorType = 'token_error';
        else if (errorMessage === 'token_timeout') errorType = 'token_timeout';
        else if (errorMessage === 'script_timeout') errorType = 'script_timeout';
        else if (errorMessage === 'auth_failure') errorType = 'auth_failure';
        else if (errorMessage === 'places_missing') errorType = 'places_missing';

        // Should we retry?
        if (globalState.retryCount < MAX_RETRIES && errorType !== 'auth_failure') {
          globalState.retryCount++;
          console.log('[GoogleMaps] Retrying... (attempt', globalState.retryCount + 1, ')');
          cleanupGoogleMaps();
          globalState.isLoading = true;
          
          // Wait a bit before retry
          await new Promise(r => setTimeout(r, 1000));
          return attemptLoad();
        }

        // Final failure - go to fallback
        globalState.isLoading = false;
        console.warn('[GoogleMaps] ❌ Switching to fallback mode. Error:', errorType);
        updateState({
          isLoaded: false,
          isLoading: false,
          isFallback: true,
          stage: 'fallback',
          error: errorType,
        });
      }
    };

    globalState.loadPromise = attemptLoad();
    await globalState.loadPromise;
  }, [fetchToken, loadScript, updateState]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Only start init once per mount
    if (!initStartedRef.current) {
      initStartedRef.current = true;
      initialize();
    }

    // Listen for retry events
    const handleRetry = () => {
      initStartedRef.current = false;
      setState({
        isLoaded: false,
        isLoading: true,
        error: null,
        token: null,
        isFallback: false,
        stage: 'idle',
      });
      setTimeout(() => {
        initStartedRef.current = true;
        initialize();
      }, 100);
    };

    window.addEventListener('googlemaps-retry', handleRetry);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('googlemaps-retry', handleRetry);
    };
  }, [initialize]);

  return {
    ...state,
    retry: retryGoogleMapsLoader,
    getDiagnostic: getGoogleMapsDiagnostic,
  };
}

export default useGoogleMapsLoader;
