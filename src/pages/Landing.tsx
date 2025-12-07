import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
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

      {/* Premium Floating CTA with pulse rings and glow */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 animate-fade-in">
        <div className="relative group">
          {/* Pulsing glow rings */}
          <div className="absolute -inset-2 bg-primary/40 rounded-full blur-xl opacity-60 group-hover:opacity-100 animate-pulse transition-opacity" style={{ animationDuration: '2s' }} />
          <div className="absolute -inset-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDuration: '1.5s' }} />
          </div>
          <div className="absolute -inset-4 rounded-full opacity-0 group-hover:opacity-60 transition-opacity">
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          </div>
          
          <Button 
            asChild 
            size="lg" 
            className="relative shadow-2xl shadow-primary/40 hover:shadow-primary/60 transition-all duration-300 group/btn text-sm md:text-base px-4 md:px-6 overflow-hidden hover:scale-105"
          >
            <Link to="/nouveau-mandat">
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
              
              <span className="hidden sm:inline relative z-10">👉 Démarre ta recherche</span>
              <span className="sm:hidden relative z-10">👉 Démarrer</span>
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover/btn:translate-x-1 transition-transform relative z-10" />
            </Link>
          </Button>
          
          {/* Floating sparkle */}
          <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
        </div>
      </div>
    </div>
  );
}
