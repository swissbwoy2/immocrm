import { useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicSiteLayout } from '@/components/public-site/PublicSiteLayout';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';



// Page d'accueil condensée (style du tunnel /courtier) : choix Louer / Acheter en haut,
// toutes les sections suivent le parcours choisi. Les anciennes sections restent disponibles.
import { HomeHero } from '@/components/public-site/home/HomeHero';
import { HomeCalculator } from '@/components/public-site/home/HomeCalculator';
import { HomeMobileBar } from '@/components/public-site/home/HomeMobileBar';

const HomeSelection = lazy(() => import('@/components/public-site/home/HomeSelection').then(m => ({ default: m.HomeSelection })));
const HomeHowItWorks = lazy(() => import('@/components/public-site/home/HomeHowItWorks').then(m => ({ default: m.HomeHowItWorks })));
const HomePricing = lazy(() => import('@/components/public-site/home/HomePricing').then(m => ({ default: m.HomePricing })));
const HomeProof = lazy(() => import('@/components/public-site/home/HomeProof').then(m => ({ default: m.HomeProof })));
const HomeReviews = lazy(() => import('@/components/public-site/home/HomeReviews').then(m => ({ default: m.HomeReviews })));
const HomeApp = lazy(() => import('@/components/public-site/home/HomeApp').then(m => ({ default: m.HomeApp })));
const HomeFaq = lazy(() => import('@/components/public-site/home/HomeFaq').then(m => ({ default: m.HomeFaq })));
const HomeClosing = lazy(() => import('@/components/public-site/home/HomeClosing').then(m => ({ default: m.HomeClosing })));
const HomeZones = lazy(() => import('@/components/public-site/home/HomeZones').then(m => ({ default: m.HomeZones })));


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
      userRole === 'candidat' ? '/candidat' :
      null;

    if (target) {
      hasRedirected.current = true;
      navigate(target, { replace: true });
    }
  }, [user, userRole, loading, navigate]);

  return (
    <PublicSiteLayout stickyCta={<HomeMobileBar />}>
      <div className="home-tokens bg-white">
        {/* Bannière publicitaire configurable par l'admin, tout en haut (masquée si aucune bannière active) */}
        <div className="mx-auto w-full max-w-[1120px] px-4 pt-4 md:px-6 md:pt-6 empty:hidden">
          <DashboardAdBanner />
        </div>

        {/* 1. Choix du parcours, accroche, « Notre sélection », propriétaires */}
        <HomeHero />

        {/* 2. Calculateur (ancre #analyse-dossier) */}
        <HomeCalculator />

        <Suspense fallback={null}>
          <HomeSelection />
          <HomeHowItWorks />
          <HomePricing />
          <HomeProof />
          <HomeReviews />
          <HomeApp />
          <HomeFaq />
          <HomeClosing />
          <HomeZones />
        </Suspense>

        {/* Place pour la barre fixe du bas sur téléphone */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
      </div>
    </PublicSiteLayout>
  );
}
