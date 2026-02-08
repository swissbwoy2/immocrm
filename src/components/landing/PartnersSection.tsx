import { Handshake } from "lucide-react";

import allianzLogo from "@/assets/partners/allianz.svg";
import axaLogo from "@/assets/partners/axa.svg";
import resolveLogo from "@/assets/partners/resolve.svg";
import firstcautionLogo from "@/assets/partners/firstcaution.svg";
import flatfoxLogo from "@/assets/partners/flatfox.svg";
import immobilierChLogo from "@/assets/partners/immobilier-ch.svg";
import realadvisorLogo from "@/assets/partners/realadvisor.png";

interface Partner {
  name: string;
  logo: string;
  href?: string;
}

const partners: Partner[] = [
  { name: "Allianz", logo: allianzLogo },
  { name: "AXA", logo: axaLogo },
  {
    name: "Resolve",
    logo: resolveLogo,
    href: "https://app.resolve.ch/?ref=3cDockrkQdpgjmMqm&utm_source=referral_link_user",
  },
  {
    name: "FirstCaution",
    logo: firstcautionLogo,
    href: "https://www.firstcaution.ch/fr/onboarding/?ref=link=0062863",
  },
  { name: "Flatfox", logo: flatfoxLogo },
  { name: "Immobilier.ch", logo: immobilierChLogo },
  { name: "RealAdvisor", logo: realadvisorLogo },
];

function PartnerLogo({ partner }: { partner: Partner }) {
  const img = (
    <img
      src={partner.logo}
      alt={partner.name}
      className="h-10 md:h-12 w-auto object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
    />
  );

  if (partner.href) {
    return (
      <a
        href={partner.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-center p-4 rounded-xl hover:bg-background/60 transition-all duration-300"
        title={partner.name}
      >
        {img}
      </a>
    );
  }

  return (
    <div
      className="group flex items-center justify-center p-4 rounded-xl hover:bg-background/60 transition-all duration-300"
      title={partner.name}
    >
      {img}
    </div>
  );
}

export function PartnersSection() {
  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-muted/30" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-background/80 rounded-full px-4 py-2 mb-4 border border-border/40">
            <Handshake className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Écosystème de confiance</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Nos partenaires de <span className="text-primary">confiance</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Nous collaborons avec les acteurs majeurs de l'immobilier et de l'assurance en Suisse
          </p>
        </div>

        {/* Logos grid */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 animate-fade-in">
          {partners.map((partner) => (
            <PartnerLogo key={partner.name} partner={partner} />
          ))}
        </div>
      </div>
    </section>
  );
}
