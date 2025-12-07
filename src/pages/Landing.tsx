import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { HeroSection } from '@/components/landing/HeroSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { GuaranteeSection } from '@/components/landing/GuaranteeSection';
import { DifferentiationSection } from '@/components/landing/DifferentiationSection';
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
      <GuaranteeSection />
      <DifferentiationSection />
      <HowItWorks />
      <CoverageSection />
      <StatsSection />
      <ApporteurSection />
      <LandingFooter />

      {/* Floating CTA */}
      <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
        <Button 
          asChild 
          size="lg" 
          className="shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 group"
        >
          <Link to="/nouveau-mandat">
            👉 Démarre ta recherche
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
