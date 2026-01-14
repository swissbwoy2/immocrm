import { useEffect, useCallback } from 'react';
import { initTikTokPixel, trackTikTokEvent, trackTikTokPageView, TikTokEvents } from '@/lib/tiktok-pixel';

const COOKIE_CONSENT_KEY = 'cookie-consent';

export function useTikTokPixel() {
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      initTikTokPixel();
    }
  }, []);

  const trackPageView = useCallback(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      trackTikTokPageView();
    }
  }, []);

  const trackEvent = useCallback((event: string, params?: object) => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      trackTikTokEvent(event, params);
    }
  }, []);

  const trackLead = useCallback((params?: object) => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      TikTokEvents.submitForm(params);
    }
  }, []);

  const trackRegistration = useCallback((params?: object) => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      TikTokEvents.completeRegistration(params);
    }
  }, []);

  const trackContact = useCallback((params?: object) => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      TikTokEvents.contact(params);
    }
  }, []);

  return {
    trackPageView,
    trackEvent,
    trackLead,
    trackRegistration,
    trackContact,
  };
}
