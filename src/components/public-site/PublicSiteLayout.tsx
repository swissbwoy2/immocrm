import { Suspense, lazy, ReactNode } from 'react';
import { SearchTypeProvider } from '@/contexts/SearchTypeContext';
import { useWhatsAppTracking } from '@/hooks/useWhatsAppTracking';
import { PublicSiteHeader } from './PublicSiteHeader';
import { PublicSiteFooter } from './PublicSiteFooter';
import { StickyMobileCTA } from './sections/StickyMobileCTA';
import { ScrollProgressBar } from './animations/ScrollProgressBar';

const CookieConsentBanner = lazy(() => import('@/components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })));

function PublicSiteInner({ children }: { children: ReactNode }) {
  useWhatsAppTracking();

  return (
    <div className="theme-luxury min-h-screen bg-background text-foreground">
      {/* Scroll progress bar dorée */}
      <ScrollProgressBar />


      <PublicSiteHeader />

      {children}

      <PublicSiteFooter />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />

      {/* WhatsApp / Google Reviews Widget — raised above sticky mobile CTA */}
      <div
        className="fixed left-4 md:left-6 z-[60] opacity-90 hover:opacity-100 transition-opacity"
        style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="elfsight-app-015a7ee8-3cf5-416f-a607-eb9d4a46e860" data-elfsight-app-lazy></div>
      </div>

      {/* Cookie Consent */}
      <Suspense fallback={null}>
        <CookieConsentBanner />
      </Suspense>
    </div>
  );
}

export function PublicSiteLayout({ children }: { children: ReactNode }) {
  return (
    <SearchTypeProvider>
      <PublicSiteInner>{children}</PublicSiteInner>
    </SearchTypeProvider>
  );
}
