import { Suspense, lazy, ReactNode } from 'react';
import { SearchTypeProvider } from '@/contexts/SearchTypeContext';
import { useWhatsAppTracking } from '@/hooks/useWhatsAppTracking';
import { PublicSiteHeader } from './PublicSiteHeader';
import { PublicSiteFooter } from './PublicSiteFooter';
import { StickyMobileCTA } from './sections/StickyMobileCTA';

const CookieConsentBanner = lazy(() => import('@/components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })));

function PublicSiteInner({ children }: { children: ReactNode }) {
  useWhatsAppTracking();

  return (
    <div className="theme-luxury min-h-screen bg-background text-foreground">
      {/* Top banner — luxury black with gold underline */}
      <div
        className="bg-[hsl(30_15%_10%)] border-b border-[hsl(38_45%_48%/0.4)]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container mx-auto px-4 py-2 text-center">
          <p className="text-xs sm:text-sm text-[hsl(40_25%_85%)] tracking-wide">
            Un logiciel propulsé par{' '}
            <a
              href="https://www.immo-rama.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(38_55%_70%)] hover:text-[hsl(38_55%_85%)] font-serif font-semibold transition-colors"
            >
              Immo-rama.ch
            </a>
          </p>
        </div>
      </div>

      <PublicSiteHeader />

      {children}

      <PublicSiteFooter />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />

      {/* WhatsApp Widget */}
      <div
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-40 opacity-70 hover:opacity-100 transition-opacity"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
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
