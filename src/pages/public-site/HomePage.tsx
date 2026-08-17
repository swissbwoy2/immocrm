import { useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicSiteLayout } from '@/components/public-site/PublicSiteLayout';


// Above the fold - eager
import { HeroSection } from '@/components/public-site/sections/HeroSection';
import { DossierAnalyseSection } from '@/components/public-site/sections/DossierAnalyseSection';
import { SocialProofSection } from '@/components/public-site/sections/SocialProofSection';
import { TeamSection } from '@/components/public-site/sections/TeamSection';
import { ForWhoSection } from '@/components/public-site/sections/ForWhoSection';
import { HowItWorksSection } from '@/components/public-site/sections/HowItWorksSection';

// Below the fold - lazy
const DifferentiatorSection = lazy(() => import('@/components/public-site/sections/DifferentiatorSection').then(m => ({ default: m.DifferentiatorSection })));
const ServicesFullSection = lazy(() => import('@/components/public-site/sections/ServicesFullSection').then(m => ({ default: m.ServicesFullSection })));
const GuaranteeSection = lazy(() => import('@/components/public-site/sections/GuaranteeSection').then(m => ({ default: m.GuaranteeSection })));
const PricingSection = lazy(() => import('@/components/public-site/sections/PricingSection').then(m => ({ default: m.PricingSection })));
const BudgetCalcSection = lazy(() => import('@/components/public-site/sections/BudgetCalcSection').then(m => ({ default: m.BudgetCalcSection })));
const CoverageSection = lazy(() => import('@/components/public-site/sections/CoverageSection').then(m => ({ default: m.CoverageSection })));
const StatsSection = lazy(() => import('@/components/public-site/sections/StatsSection').then(m => ({ default: m.StatsSection })));
const PartnersSection = lazy(() => import('@/components/public-site/sections/PartnersSection').then(m => ({ default: m.PartnersSection })));
const TechSection = lazy(() => import('@/components/public-site/sections/TechSection').then(m => ({ default: m.TechSection })));
const FAQSection = lazy(() => import('@/components/public-site/sections/FAQSection').then(m => ({ default: m.FAQSection })));
const CloserSection = lazy(() => import('@/components/public-site/sections/CloserSection').then(m => ({ default: m.CloserSection })));
const AppShowcaseSection = lazy(() => import('@/components/public-site/sections/AppShowcaseSection').then(m => ({ default: m.AppShowcaseSection })));
const DossierAnalyseForm = lazy(() => import('@/components/public-site/sections/DossierAnalyseForm').then(m => ({ default: m.DossierAnalyseForm })));

export default function HomePage() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Auth redirect — fires once per mount to avoid bouncing on token refresh
  useEffect(() => {
    if (hasRedirected.current) return;
    if (loading || !user || !userRole) return;

    const target =
      userRole === 'admin' ? '/admin' :
      userRole === 'agent' ? '/agent' :
      userRole === 'client' ? '/client' :
      userRole === 'apporteur' ? '/apporteur' :
      null;

    if (target) {
      hasRedirected.current = true;
      navigate(target, { replace: true });
    }
  }, [user, userRole, loading, navigate]);

  return (
    <PublicSiteLayout>



      {/* Eager sections */}
      <DossierAnalyseSection />

      <Suspense fallback={null}>
        <StoriesShowcaseSection />
      </Suspense>

      <HeroSection />


      {/* Lazy sections */}
      <Suspense fallback={null}>
        <AppShowcaseSection />
      </Suspense>

      <Suspense fallback={null}>
        <PricingSection />
      </Suspense>

      <SocialProofSection />
      <TeamSection />
      <ForWhoSection />
      <HowItWorksSection />

      {/* Lazy sections */}
      <Suspense fallback={null}>
        <DifferentiatorSection />
        <ServicesFullSection />
        <BudgetCalcSection />
        <DossierAnalyseForm />
        <GuaranteeSection />
        <CoverageSection />
        <StatsSection />
        <PartnersSection />
        <TechSection />
        <FAQSection />
        <CloserSection />
      </Suspense>
    </PublicSiteLayout>
  );
}
