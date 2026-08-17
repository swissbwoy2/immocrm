import { Suspense, lazy, ReactNode } from 'react';
import { SearchTypeProvider } from '@/contexts/SearchTypeContext';
import { useWhatsAppTracking } from '@/hooks/useWhatsAppTracking';
import { PublicSiteHeader } from './PublicSiteHeader';
import { PublicSiteFooter } from './PublicSiteFooter';
import { StickyMobileCTA } from './sections/StickyMobileCTA';
import { ScrollProgressBar } from './animations/ScrollProgressBar';
import { useStoryDialogOpen } from './showcase/storyDialogState';

const CookieConsentBanner = lazy(() => import('@/components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })));

function PublicSiteInner({ children }: { children: ReactNode }) {
  useWhatsAppTracking();

  return (
    <div
      className="theme-luxury min-h-screen bg-background text-foreground"
      style={{
        // Hauteurs de référence utilisées par le header (fixe) et le décalage du contenu
        ['--banner-h' as any]: '34px',
        ['--header-h' as any]: '60px',
      }}
    >
      {/* Scroll progress bar dorée */}
      <ScrollProgressBar />

      {/* Top banner — propulsé par Immo-rama.ch */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] border-b"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          backgroundColor: 'hsl(142 35% 94%)',
          borderBottomColor: 'hsl(142 45% 50% / 0.3)',
        }}
      >
        <div
          className="container mx-auto px-4 text-center flex items-center justify-center"
          style={{ height: 'var(--banner-h)' }}
        >
          <p className="text-[11px] sm:text-sm tracking-wide leading-none" style={{ color: 'hsl(215 20% 30%)' }}>
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

      {/* Décalage global pour compenser la bannière + le header fixes */}
      <div
        style={{
          paddingTop:
            'calc(var(--banner-h) + var(--header-h) + env(safe-area-inset-top, 0px))',
        }}
      >
        {children}
      </div>

      <PublicSiteFooter />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />

      {/* WhatsApp / Google Reviews Widget — desktop only to avoid overlapping mobile sticky CTA */}
      <div
        data-floating-widget
        className="hidden md:block fixed left-6 bottom-6 z-[60] opacity-90 hover:opacity-100 transition-opacity"
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
