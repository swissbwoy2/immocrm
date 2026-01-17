import { useEffect } from 'react';
import { FloatingNav } from '@/components/landing/FloatingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { VendeurHeroSection } from '@/components/landing/vendeur/VendeurHeroSection';
import { VendeurMatchingSection } from '@/components/landing/vendeur/VendeurMatchingSection';
import { VendeurZeroCommissionSection } from '@/components/landing/vendeur/VendeurZeroCommissionSection';
import { VendeurOffMarketSection } from '@/components/landing/vendeur/VendeurOffMarketSection';
import { VendeurWorkflowSection } from '@/components/landing/vendeur/VendeurWorkflowSection';
import { VendeurDifferentiationSection } from '@/components/landing/vendeur/VendeurDifferentiationSection';
import { VendeurFAQSection } from '@/components/landing/vendeur/VendeurFAQSection';
import { VendeurCTASection } from '@/components/landing/vendeur/VendeurCTASection';

export default function VendreMonBien() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      
      <main>
        <VendeurHeroSection />
        <VendeurMatchingSection />
        <VendeurZeroCommissionSection />
        <VendeurOffMarketSection />
        <VendeurWorkflowSection />
        <VendeurDifferentiationSection />
        <VendeurFAQSection />
        <VendeurCTASection />
      </main>

      <LandingFooter />
    </div>
  );
}
