import { useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { initMetaPixel, trackMetaPageView } from '@/lib/meta-pixel';

const COOKIE_CONSENT_KEY = 'cookie-consent';

interface MetaPixelProviderProps {
  children: ReactNode;
}

export function MetaPixelProvider({ children }: MetaPixelProviderProps) {
  const location = useLocation();

  // Initialize pixel on mount only if consent was already given
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    initMetaPixel(consent === 'accepted');
  }, []);

  // Track page views on route change
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted') {
      trackMetaPageView();
    }
  }, [location.pathname]);

  return <>{children}</>;
}
