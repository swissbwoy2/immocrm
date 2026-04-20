import { Radar, BarChart3, FileCheck, LayoutDashboard, Cpu, Crown, Brain, Globe, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { TiltCard } from '@/components/public-site/animations/TiltCard';
import { OrbitingCircles } from '@/components/public-site/magic/OrbitingCircles';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';

const features = [
  { icon: Radar, title: 'Veille 24h/24', description: "Nos robots surveillent tous les portails + notre réseau privé. Dès qu'un bien sort, tu le sais." },
  { icon: BarChart3, title: 'Matching intelligent', description: "On te propose que les biens qui matchent vraiment avec ton budget et ta situation." },
  { icon: FileCheck, title: 'Dossier pro généré auto', description: "Un dossier aux standards des régies, prêt à envoyer. Zéro prise de tête." },
  { icon: LayoutDashboard, title: 'Ton tableau de bord perso', description: "Suis chaque étape de ta recherche en direct depuis ton espace client." },
];

const orbitIcons = [Radar, BarChart3, FileCheck, Globe, Brain, Shield, Zap, LayoutDashboard];

export function TechSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-background via-[hsl(38_45%_48%/0.02)] to-background">
      <div className="container mx-auto px-4 relative z-10">

        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">

          {/* Orbit visualization */}
          <ScrollReveal variant="slide-right" className="hidden lg:flex items-center justify-center">
            <div className="relative w-72 h-72">
              {/* Center orb */}
              <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)] flex items-center justify-center shadow-[0_0_30px_hsl(38_45%_48%/0.4)] z-10">
                <Cpu className="h-8 w-8 text-[hsl(40_35%_98%)]" />
              </div>

              {/* Inner orbit */}
              {orbitIcons.slice(0, 4).map((Icon, i) => (
                <OrbitingCircles key={i} radius={90} duration={18} delay={i * 4.5} iconSize={36} path={i === 0}>
                  <Icon className="h-4 w-4 text-[hsl(38_45%_48%)]" />
                </OrbitingCircles>
              ))}

              {/* Outer orbit */}
              {orbitIcons.slice(4).map((Icon, i) => (
                <OrbitingCircles key={i + 4} radius={130} duration={28} delay={i * 7} reverse iconSize={32} path={i === 0}>
                  <Icon className="h-3.5 w-3.5 text-[hsl(28_35%_45%)]" />
                </OrbitingCircles>
              ))}
            </div>
          </ScrollReveal>

          {/* Features */}
          <div>
            <ScrollReveal variant="fade-up" className="mb-4">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="bg-[hsl(38_45%_48%/0.08)] border border-[hsl(38_45%_48%/0.25)] rounded-full px-5 py-2.5">
                  <Cpu className="inline-block h-4 w-4 text-[hsl(38_45%_48%)] mr-2" />
                  <span className="text-sm font-semibold text-[hsl(38_45%_48%)]">Tech & Innovation</span>
                </div>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 font-serif">
                Ce que font nos outils{' '}
                <span className="luxury-gradient-text">pour toi</span>
              </h2>
              <p className="text-muted-foreground max-w-md leading-relaxed">
                La tech au service de ta recherche, 24h/24. Pendant que tu dors, on bosse.
              </p>
            </ScrollReveal>

            <GoldDivider className="mb-8" />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="space-y-4"
            >
              {features.map((feature, index) => (
                <motion.div key={index} variants={staggerItem}>
                  <TiltCard intensity={3}>
                    <div className="relative rounded-2xl p-5 group bg-card/80 border border-border/40 hover:border-[hsl(38_45%_48%/0.4)] hover:shadow-[0_8px_24px_hsl(38_45%_48%/0.08)] transition-all duration-500">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(38_45%_48%/0.12)] to-[hsl(28_35%_35%/0.08)] border border-[hsl(38_45%_48%/0.2)] group-hover:border-[hsl(38_45%_48%/0.45)] flex items-center justify-center transition-all duration-300">
                          <feature.icon className="h-6 w-6 text-[hsl(38_45%_48%)]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1 group-hover:text-[hsl(38_45%_44%)] transition-colors font-serif">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.5)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl" />
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        <ScrollReveal variant="fade-up" delay={0.3} className="text-center mt-12">
          <div className="inline-flex items-center gap-3 bg-card/80 rounded-full px-6 py-3 border border-[hsl(38_45%_48%/0.25)]">
            <Crown className="h-5 w-5 text-[hsl(38_55%_65%)]" />
            <span className="text-foreground font-medium text-sm">L'alliance parfaite : humains + robots + réseau privé 🚀</span>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
