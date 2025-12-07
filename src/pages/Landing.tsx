import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { HeroSection } from '@/components/landing/HeroSection';
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
      <HeroSection />
      <BenefitsSection />
      <BudgetCalculatorSection />
      <GuaranteeSection />
      <DifferentiationSection />
      <FAQSection />
      <HowItWorks />
      <CoverageSection />
      <StatsSection />
      <ApporteurSection />
      <LandingFooter />

      {/* Floating CTA - smaller on mobile */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 animate-fade-in">
        <Button 
          asChild 
          size="lg" 
          className="shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 group text-sm md:text-base px-4 md:px-6"
        >
          <Link to="/nouveau-mandat">
            <span className="hidden sm:inline">👉 Démarre ta recherche</span>
            <span className="sm:hidden">👉 Démarrer</span>
            <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
