import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SearchTypeProvider } from '@/contexts/SearchTypeContext';
import { useWhatsAppTracking } from '@/hooks/useWhatsAppTracking';

// Above the fold - eager load
import { PremiumHero } from '@/components/landing/premium/PremiumHero';
import { TeamSection } from '@/components/landing/TeamSection';
import { ForWhoSection } from '@/components/landing/premium/ForWhoSection';
import { HowItWorksSection } from '@/components/landing/premium/HowItWorksSection';
import { FloatingNav } from '@/components/landing/FloatingNav';
import { StickyMobileCTA } from '@/components/landing/premium/StickyMobileCTA';

// Below the fold - lazy load
const TestimonialVideoSection = lazy(() => import('@/components/landing/TestimonialVideoSection').then(m => ({ default: m.TestimonialVideoSection })));
const VideoSection = lazy(() => import('@/components/landing/VideoSection').then(m => ({ default: m.VideoSection })));
const WhatYouGetSection = lazy(() => import('@/components/landing/premium/WhatYouGetSection').then(m => ({ default: m.WhatYouGetSection })));
const DossierAnalyseSection = lazy(() => import('@/components/landing/DossierAnalyseSection').then(m => ({ default: m.DossierAnalyseSection })));
const GuaranteeSection = lazy(() => import('@/components/landing/GuaranteeSection').then(m => ({ default: m.GuaranteeSection })));
const PricingSection = lazy(() => import('@/components/landing/premium/PricingSection').then(m => ({ default: m.PricingSection })));
const BudgetCalculatorSection = lazy(() => import('@/components/landing/BudgetCalculatorSection').then(m => ({ default: m.BudgetCalculatorSection })));
const DifferentiationSection = lazy(() => import('@/components/landing/DifferentiationSection').then(m => ({ default: m.DifferentiationSection })));
const PremiumFAQ = lazy(() => import('@/components/landing/premium/PremiumFAQ').then(m => ({ default: m.PremiumFAQ })));
const CoverageSection = lazy(() => import('@/components/landing/CoverageSection').then(m => ({ default: m.CoverageSection })));
const StatsSection = lazy(() => import('@/components/landing/StatsSection').then(m => ({ default: m.StatsSection })));
const PartnersSection = lazy(() => import('@/components/landing/PartnersSection').then(m => ({ default: m.PartnersSection })));
const ProptechSection = lazy(() => import('@/components/landing/ProptechSection').then(m => ({ default: m.ProptechSection })));
const CloserSection = lazy(() => import('@/components/landing/premium/CloserSection').then(m => ({ default: m.CloserSection })));
const ApporteurSection = lazy(() => import('@/components/landing/ApporteurSection').then(m => ({ default: m.ApporteurSection })));
const LandingFooter = lazy(() => import('@/components/landing/LandingFooter').then(m => ({ default: m.LandingFooter })));
const CookieConsentBanner = lazy(() => import('@/components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })));

export default function Landing() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  useWhatsAppTracking();

  useEffect(() => {
    if (!loading && user && userRole) {
      switch (userRole) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'agent':
          navigate('/agent', { replace: true });
          break;
        case 'client':
          navigate('/client', { replace: true });
          break;
        case 'apporteur':
          navigate('/apporteur', { replace: true });
          break;
      }
    }
  }, [user, userRole, loading, navigate]);

  return (
    <SearchTypeProvider>
      <div className="min-h-screen bg-background">
        <FloatingNav />

        {/* Top banner */}
        <div
          className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="container mx-auto px-4 py-2 text-center">
            <p className="text-xs sm:text-sm text-slate-300">
              Un logiciel propulsé par{' '}
              <a
                href="https://www.immo-rama.ch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Immo-rama.ch
              </a>
            </p>
          </div>
        </div>

        {/* Eager sections */}
        <PremiumHero />
        <TeamSection />
        <ForWhoSection />
        <HowItWorksSection />

        {/* Lazy loaded sections */}
        <Suspense fallback={null}>
          <TestimonialVideoSection />
          <VideoSection />
          <WhatYouGetSection />
          <DossierAnalyseSection />
          <GuaranteeSection />
          <PricingSection />
          <BudgetCalculatorSection />
          <DifferentiationSection />
          <PremiumFAQ />
          <CoverageSection />
          <StatsSection />
          <PartnersSection />
          <ProptechSection />
          <CloserSection />
          <ApporteurSection />
          <LandingFooter />
        </Suspense>

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
    </SearchTypeProvider>
  );
}
