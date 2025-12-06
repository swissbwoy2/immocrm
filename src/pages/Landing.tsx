import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { ServicesSection } from '@/components/landing/ServicesSection';
import { CoverageSection } from '@/components/landing/CoverageSection';
import { WhyChooseUs } from '@/components/landing/WhyChooseUs';
import { ApporteurSection } from '@/components/landing/ApporteurSection';
import { StatsSection } from '@/components/landing/StatsSection';
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
      <HowItWorks />
      <ServicesSection />
      <CoverageSection />
      <WhyChooseUs />
      <ApporteurSection />
      <StatsSection />
      <LandingFooter />
    </div>
  );
}
