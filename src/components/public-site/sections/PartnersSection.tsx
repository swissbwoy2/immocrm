import { Handshake, Award } from 'lucide-react';
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
import { BorderBeam } from '@/components/public-site/magic/BorderBeam';
import { motion } from 'framer-motion';
import { useSearchType } from '@/contexts/SearchTypeContext';

const heroPartnersLocation = [
  {
    name: 'Resolve',
    logo: resolveLogo,
    href: 'https://app.resolve.ch/?ref=3cDockrkQdpgjmMqm&utm_source=referral_link_user',
    desc: 'Dépôt de garantie digital — 0 CHF bloqué',
  },
  {
    name: 'FirstCaution',
    logo: firstcautionLogo,
    href: 'https://www.firstcaution.ch/fr/onboarding/?ref=link=0062863',
    desc: 'Assurance caution locative premium',
  },
];

const heroPartnersAchat = [
  {
    name: 'RealAdvisor',
    logo: realadvisorLogo,
    href: 'https://www.realadvisor.ch',
    desc: 'Comparateur indépendant des meilleurs taux hypothécaires',
  },
  {
    name: 'Immobilier.ch',
    logo: immobilierChLogo,
    href: 'https://www.immobilier.ch',
    desc: 'Le portail immobilier n°1 en Suisse romande',
  },
];

const marqueePartners = [
  { name: 'Allianz', logo: allianzLogo },
  { name: 'AXA', logo: axaLogo },
  { name: 'Flatfox', logo: flatfoxLogo },
  { name: 'Immobilier.ch', logo: immobilierChLogo },
  { name: 'RealAdvisor', logo: realadvisorLogo },
];

export function PartnersSection() {
  const { isAchat } = useSearchType();
  const heroPartners = isAchat ? heroPartnersAchat : heroPartnersLocation;

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

        {/* HERO PARTNERS */}
        <ScrollReveal variant="fade-up" delay={0.15}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-14">
            {heroPartners.map((p, i) => (
              <motion.a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                title={p.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] as const }}
                whileHover={{ scale: 1.04 }}
                className="relative group rounded-2xl overflow-hidden"
              >
                <div className="relative flex flex-col items-center justify-center gap-4 px-8 py-8 bg-[hsl(38_45%_48%/0.06)] border-2 border-[hsl(38_45%_48%/0.3)] rounded-2xl hover:border-[hsl(38_45%_48%/0.65)] hover:shadow-[0_0_40px_hsl(38_45%_48%/0.2)] transition-all duration-500 h-36">
                  <BorderBeam duration={6} colorFrom="hsl(38 55% 65%)" colorTo="hsl(28 35% 38%)" />

                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-[hsl(38_45%_44%/0.15)] border border-[hsl(38_45%_48%/0.45)] rounded-full px-2.5 py-1">
                    <Award className="h-3 w-3 text-[hsl(38_55%_65%)]" />
                    <span className="text-[10px] font-bold text-[hsl(38_55%_65%)] uppercase tracking-widest">Partenaire privilégié</span>
                  </div>

                  <img
                    src={p.logo}
                    alt={p.name}
                    className="h-12 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ filter: 'drop-shadow(0 0 8px hsl(38 45% 48% / 0.25))' }}
                  />
                  <p className="text-xs text-[hsl(40_20%_60%)] group-hover:text-[hsl(40_20%_75%)] text-center transition-colors">{p.desc}</p>

                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,hsl(38_45%_48%/0.06),transparent)]" />
                </div>
              </motion.a>
            ))}
          </div>
        </ScrollReveal>

        {/* SECONDARY PARTNERS — Marquee */}
        <ScrollReveal variant="fade-in" delay={0.25}>
          <p className="text-center text-xs uppercase tracking-widest text-[hsl(40_20%_45%)] mb-6 font-medium">
            Autres partenaires
          </p>
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-background to-transparent" />
            <Marquee pauseOnHover repeat={4} className="[--duration:25s]">
              {marqueePartners.map((p) => (
                <div
                  key={p.name}
                  title={p.name}
                  className="mx-6 flex items-center justify-center px-7 py-4 rounded-xl bg-card/50 border border-[hsl(38_45%_48%/0.12)] hover:border-[hsl(38_45%_48%/0.35)] hover:bg-[hsl(38_45%_48%/0.05)] transition-all duration-400 w-40"
                >
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="h-8 w-auto object-contain grayscale opacity-45 hover:grayscale-0 hover:opacity-85 transition-all duration-400"
                  />
                </div>
              ))}
            </Marquee>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
