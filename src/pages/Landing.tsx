import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SearchTypeProvider } from '@/contexts/SearchTypeContext';
import { useWhatsAppTracking } from '@/hooks/useWhatsAppTracking';

// Above the fold - eager load
import { HeroSection } from '@/components/landing/HeroSection';
import { SocialProofBar } from '@/components/landing/SocialProofBar';
import { TeamSection } from '@/components/landing/TeamSection';
import { QuickLeadForm } from '@/components/landing/QuickLeadForm';
import { FloatingNav } from '@/components/landing/FloatingNav';


// Below the fold - lazy load
const TestimonialVideoSection = lazy(() => import('@/components/landing/TestimonialVideoSection').then(m => ({ default: m.TestimonialVideoSection })));
const VideoSection = lazy(() => import('@/components/landing/VideoSection').then(m => ({ default: m.VideoSection })));
const DossierAnalyseSection = lazy(() => import('@/components/landing/DossierAnalyseSection').then(m => ({ default: m.DossierAnalyseSection })));
const GuaranteeSection = lazy(() => import('@/components/landing/GuaranteeSection').then(m => ({ default: m.GuaranteeSection })));
const BenefitsSection = lazy(() => import('@/components/landing/BenefitsSection').then(m => ({ default: m.BenefitsSection })));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks').then(m => ({ default: m.HowItWorks })));
const BudgetCalculatorSection = lazy(() => import('@/components/landing/BudgetCalculatorSection').then(m => ({ default: m.BudgetCalculatorSection })));
const DifferentiationSection = lazy(() => import('@/components/landing/DifferentiationSection').then(m => ({ default: m.DifferentiationSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));
const CoverageSection = lazy(() => import('@/components/landing/CoverageSection').then(m => ({ default: m.CoverageSection })));
const StatsSection = lazy(() => import('@/components/landing/StatsSection').then(m => ({ default: m.StatsSection })));
const PartnersSection = lazy(() => import('@/components/landing/PartnersSection').then(m => ({ default: m.PartnersSection })));
const ProptechSection = lazy(() => import('@/components/landing/ProptechSection').then(m => ({ default: m.ProptechSection })));
const EntreprisesRHSection = lazy(() => import('@/components/landing/EntreprisesRHSection').then(m => ({ default: m.EntreprisesRHSection })));
const ApporteurSection = lazy(() => import('@/components/landing/ApporteurSection').then(m => ({ default: m.ApporteurSection })));
const LandingFooter = lazy(() => import('@/components/landing/LandingFooter').then(m => ({ default: m.LandingFooter })));
const CookieConsentBanner = lazy(() => import('@/components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })));

export default function Landing() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  useWhatsAppTracking();

  // Redirect authenticated users to their dashboard
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
        {/* Floating Navigation */}
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
        
        {/* OPTIMIZED SECTION ORDER - Form visible without scroll */}
        <HeroSection />
        <SocialProofBar />
        <TeamSection />
        <QuickLeadForm />
        

        {/* Lazy loaded sections below the fold */}
        <Suspense fallback={null}>
          <TestimonialVideoSection />
          <VideoSection />
          <DossierAnalyseSection />
          <GuaranteeSection />
          <BenefitsSection />
          <HowItWorks />
          <BudgetCalculatorSection />
          <DifferentiationSection />
          <FAQSection />
          <CoverageSection />
          <StatsSection />
          <PartnersSection />
          <ProptechSection />
          <ApporteurSection />
          <LandingFooter />
        </Suspense>

        {/* Floating WhatsApp Widget - Bottom Left */}
        <div 
          className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="elfsight-app-015a7ee8-3cf5-416f-a607-eb9d4a46e860" data-elfsight-app-lazy></div>
        </div>

        {/* Cookie Consent Banner */}
        <Suspense fallback={null}>
          <CookieConsentBanner />
        </Suspense>
      </div>
    </SearchTypeProvider>
  );
}
