import { useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { initTikTokPixel, trackTikTokPageView } from '@/lib/tiktok-pixel';

const COOKIE_CONSENT_KEY = 'cookie-consent';

interface TikTokPixelProviderProps {
  children: ReactNode;
}

export function TikTokPixelProvider({ children }: TikTokPixelProviderProps) {
  const location = useLocation();

  // Initialize pixel on mount if consent already given
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      initTikTokPixel();
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      trackTikTokPageView();
    }
  }, [location.pathname]);

  return <>{children}</>;
}
