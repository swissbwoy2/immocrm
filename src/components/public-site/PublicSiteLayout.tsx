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

      {/* Top banner — luxury black with gold underline (fixed above header) */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] border-b"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          backgroundColor: 'hsl(142 35% 94%)',
          borderBottomColor: 'hsl(142 45% 50% / 0.3)',
        }}
      >
        <div className="container mx-auto px-4 py-0.5 sm:py-1 text-center">
          <p className="text-[10px] sm:text-xs tracking-wide leading-tight" style={{ color: 'hsl(215 20% 30%)' }}>
            Un logiciel propulsé par{' '}
            <a
              href="https://www.immo-rama.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: 'hsl(142 45% 40%)' }}
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
