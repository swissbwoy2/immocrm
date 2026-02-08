import { useEffect, useMemo } from 'react';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const STORAGE_KEY = 'immo_utm_params';

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

/**
 * Captures UTM parameters from the URL on first visit and persists them
 * in sessionStorage so they survive navigation within the session.
 */
export function useUTMParams(): UTMParams {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasUTM = UTM_KEYS.some((key) => params.has(key));

    if (hasUTM) {
      const utmData: Record<string, string> = {};
      UTM_KEYS.forEach((key) => {
        const value = params.get(key);
        if (value) utmData[key] = value;
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));
    }
  }, []);

  return useMemo(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          utm_source: parsed.utm_source || null,
          utm_medium: parsed.utm_medium || null,
          utm_campaign: parsed.utm_campaign || null,
          utm_content: parsed.utm_content || null,
          utm_term: parsed.utm_term || null,
        };
      }
    } catch {
      // ignore parse errors
    }
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    };
  }, []);
}
