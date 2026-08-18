import { useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicSiteLayout } from '@/components/public-site/PublicSiteLayout';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';



// Above the fold - eager
import { HeroSection } from '@/components/public-site/sections/HeroSection';
import { DossierAnalyseSection } from '@/components/public-site/sections/DossierAnalyseSection';
import { ForWhoSection } from '@/components/public-site/sections/ForWhoSection';
import { HowItWorksSection } from '@/components/public-site/sections/HowItWorksSection';

// Below the fold - lazy
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



      {/* Bannière publicitaire configurable par l'admin (masquée si aucune bannière active) */}
      <div className="container mx-auto px-4 pt-4">
        <DashboardAdBanner />
      </div>

      {/* Eager sections */}
      <DossierAnalyseSection />


      {/* Bloc hero de choix de parcours (location / achat) */}
      <HeroSection />

      {/* Calculateurs gratuits (location + achat) juste en dessous du choix de parcours */}
      <Suspense fallback={null}>
        <BudgetCalcSection />
      </Suspense>



      {/* Lazy sections */}
      <Suspense fallback={null}>
        <AppShowcaseSection />
      </Suspense>

      <Suspense fallback={null}>
        <PricingSection />
      </Suspense>

      <ForWhoSection />
      <HowItWorksSection />

      {/* Lazy sections */}
      <Suspense fallback={null}>
        <ServicesFullSection />
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
