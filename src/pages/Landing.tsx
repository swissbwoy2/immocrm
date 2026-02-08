import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SearchTypeProvider } from '@/contexts/SearchTypeContext';
import { HeroSection } from '@/components/landing/HeroSection';
import { SocialProofBar } from '@/components/landing/SocialProofBar';
import { QuickLeadForm } from '@/components/landing/QuickLeadForm';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { BudgetCalculatorSection } from '@/components/landing/BudgetCalculatorSection';
import { GuaranteeSection } from '@/components/landing/GuaranteeSection';
import { DifferentiationSection } from '@/components/landing/DifferentiationSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CoverageSection } from '@/components/landing/CoverageSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { ApporteurSection } from '@/components/landing/ApporteurSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { PartnersSection } from '@/components/landing/PartnersSection';
import { TeamSection } from '@/components/landing/TeamSection';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { ProptechSection } from '@/components/landing/ProptechSection';
import { EntreprisesRHSection } from '@/components/landing/EntreprisesRHSection';
import { FloatingNav } from '@/components/landing/FloatingNav';
import { VideoSection } from '@/components/landing/VideoSection';
import { DossierAnalyseSection } from '@/components/landing/DossierAnalyseSection';

export default function Landing() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

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
        <VideoSection />
        <DossierAnalyseSection />
        <QuickLeadForm />
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

        {/* Floating WhatsApp Widget - Bottom Left */}
        <div 
          className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="elfsight-app-015a7ee8-3cf5-416f-a607-eb9d4a46e860" data-elfsight-app-lazy></div>
        </div>

        {/* Cookie Consent Banner */}
        <CookieConsentBanner />
      </div>
    </SearchTypeProvider>
  );
}
