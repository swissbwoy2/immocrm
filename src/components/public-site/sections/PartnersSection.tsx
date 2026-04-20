import { Handshake } from 'lucide-react';
import allianzLogo from '@/assets/partners/allianz.svg';
import axaLogo from '@/assets/partners/axa.svg';
import resolveLogo from '@/assets/partners/resolve.svg';
import firstcautionLogo from '@/assets/partners/firstcaution.svg';
import flatfoxLogo from '@/assets/partners/flatfox.svg';
import immobilierChLogo from '@/assets/partners/immobilier-ch.svg';
import realadvisorLogo from '@/assets/partners/realadvisor.png';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { Marquee } from '@/components/public-site/magic/Marquee';

interface Partner { name: string; logo: string; href?: string; }

const partners: Partner[] = [
  { name: 'Allianz', logo: allianzLogo },
  { name: 'AXA', logo: axaLogo },
  { name: 'Resolve', logo: resolveLogo, href: 'https://app.resolve.ch/?ref=3cDockrkQdpgjmMqm&utm_source=referral_link_user' },
  { name: 'FirstCaution', logo: firstcautionLogo, href: 'https://www.firstcaution.ch/fr/onboarding/?ref=link=0062863' },
  { name: 'Flatfox', logo: flatfoxLogo },
  { name: 'Immobilier.ch', logo: immobilierChLogo },
  { name: 'RealAdvisor', logo: realadvisorLogo },
];

function PartnerCard({ partner }: { partner: Partner }) {
  const inner = (
    <div className="group mx-4 flex items-center justify-center px-8 py-5 rounded-2xl bg-card/60 border border-[hsl(38_45%_48%/0.15)] hover:border-[hsl(38_45%_48%/0.45)] hover:bg-[hsl(38_45%_48%/0.06)] transition-all duration-500 w-44">
      <img
        src={partner.logo}
        alt={partner.name}
        className="h-10 w-auto object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
      />
    </div>
  );
  if (partner.href) {
    return <a href={partner.href} target="_blank" rel="noopener noreferrer" title={partner.name}>{inner}</a>;
  }
  return <div title={partner.name}>{inner}</div>;
}

export function PartnersSection() {
  return (
    <section id="partenaires" className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-background/80 rounded-full px-4 py-2 mb-4 border border-[hsl(38_45%_48%/0.25)]">
            <Handshake className="h-4 w-4 text-[hsl(38_45%_48%)]" />
            <span className="text-sm font-medium text-[hsl(38_45%_48%)]">Écosystème de confiance</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3 font-serif">
            Nos partenaires de{' '}
            <span className="luxury-gradient-text">confiance</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Nous collaborons avec les acteurs majeurs de l'immobilier et de l'assurance en Suisse
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.1}>
          <GoldDivider className="mb-12" />
        </ScrollReveal>

        <div className="relative">
          {/* fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-background to-transparent" />
          <Marquee pauseOnHover repeat={3} className="[--duration:30s]">
            {partners.map((p) => (
              <PartnerCard key={p.name} partner={p} />
            ))}
          </Marquee>
        </div>

      </div>
    </section>
  );
}
