import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
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
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { ProptechSection } from '@/components/landing/ProptechSection';
import { EntreprisesRHSection } from '@/components/landing/EntreprisesRHSection';
import { FloatingNav } from '@/components/landing/FloatingNav';

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
      
      {/* OPTIMIZED SECTION ORDER */}
      <HeroSection />
      <SocialProofBar />
      <div id="quickform">
        <QuickLeadForm />
      </div>
      <BudgetCalculatorSection />
      <DifferentiationSection />
      <HowItWorks />
      <GuaranteeSection />
      <BenefitsSection />
      <FAQSection />
      <CoverageSection />
      <StatsSection />
      <ProptechSection />
      <EntreprisesRHSection />
      <ApporteurSection />
      <LandingFooter />

      {/* Floating CTA - harmonized with dashboard style */}
      <div 
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 animate-fade-in"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="relative group">
          {/* Subtle glow */}
          <div className="absolute -inset-1 bg-primary/20 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
          
          <Button 
            asChild 
            size="lg" 
            className="relative shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 text-sm md:text-base px-4 md:px-6 hover:scale-105"
          >
            <Link to="/nouveau-mandat">
              <span className="hidden sm:inline">👉 Démarre ta recherche</span>
              <span className="sm:hidden">👉 Démarrer</span>
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />
    </div>
  );
}
