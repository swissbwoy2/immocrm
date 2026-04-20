import christPhoto from '@/assets/team/christ-ramazani.png';
import { Badge } from '@/components/ui/badge';
import { Star, MessageCircle } from 'lucide-react';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { TiltCard } from '@/components/public-site/animations/TiltCard';

const teamMembers = [{ name: 'Christ Ramazani', role: "Directeur d'agence – Courtier location et vente", photo: christPhoto }];

export function TeamSection() {
  return (
    <section id="equipe" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 font-serif">
            Notre <span className="luxury-gradient-text">équipe</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Des experts passionnés à votre service pour vous accompagner dans tous vos projets immobiliers.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.1}>
          <GoldDivider className="mb-12" />
        </ScrollReveal>

        <div className="flex justify-center">
          {teamMembers.map((member, index) => (
            <ScrollReveal key={member.name} variant="fade-up" delay={index * 0.1}>
              <TiltCard intensity={4}>
                <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-card/80 border border-[hsl(38_45%_48%/0.2)] hover:border-[hsl(38_45%_48%/0.5)] hover:shadow-[0_8px_30px_hsl(38_45%_48%/0.1)] transition-all duration-500 group">
                  <div className="relative mb-5">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(38_45%_48%/0.4)] to-[hsl(28_35%_35%/0.3)] blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden ring-2 ring-[hsl(38_45%_48%/0.4)] ring-offset-2 ring-offset-background shadow-[0_0_20px_hsl(38_45%_48%/0.2)] group-hover:ring-[hsl(38_45%_48%/0.7)] transition-all duration-500">
                      <img src={member.photo} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1 font-serif">{member.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 leading-snug">{member.role}</p>
                  <Badge className="bg-[hsl(38_45%_48%/0.12)] text-[hsl(38_45%_48%)] border border-[hsl(38_45%_48%/0.3)] hover:bg-[hsl(38_45%_48%/0.18)]">
                    Courtage &amp; Relocation
                  </Badge>
                  <div className="flex items-center gap-1 mt-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[hsl(38_55%_65%)] text-[hsl(38_55%_65%)]" />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">4.8/5</span>
                  </div>
                </div>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
