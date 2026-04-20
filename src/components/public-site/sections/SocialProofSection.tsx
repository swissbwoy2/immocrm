import { Award, Users, Play } from 'lucide-react';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';

export function SocialProofSection() {
  return (
    <section id="avis" className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden luxury-mesh-bg">
      <div className="container mx-auto px-4 relative z-10">

        {/* Stats badges */}
        <ScrollReveal variant="fade-in" className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-4">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-[hsl(38_45%_48%/0.3)] shadow-sm">
            <Award className="h-4 w-4 text-[hsl(38_45%_48%)]" />
            <span className="text-sm font-medium text-foreground">Experts relocation depuis 2016</span>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.05}>
          <GoldDivider className="mb-12" />
        </ScrollReveal>

        {/* Google Reviews Widget */}
        <ScrollReveal variant="fade-up" delay={0.1} className="max-w-5xl mx-auto mb-16">
          <div className="elfsight-app-6edfc233-2b60-465a-9be1-9b16cf306e85" />
        </ScrollReveal>

        {/* Video testimonials */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          <motion.div variants={staggerItem}>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[hsl(38_45%_48%)] bg-[hsl(38_45%_48%/0.08)] rounded-full px-3 py-1.5 mb-3 border border-[hsl(38_45%_48%/0.2)]">
                <Users className="h-3 w-3" />
                <span>Témoignage clients</span>
              </div>
              <h3 className="text-lg font-bold text-foreground font-serif">Ils nous ont fait confiance 🤝</h3>
            </div>
            <div className="relative w-full rounded-2xl overflow-hidden bg-muted shadow-lg border border-[hsl(38_45%_48%/0.2)] hover:border-[hsl(38_45%_48%/0.4)] transition-colors duration-300">
              <iframe
                src="https://www.instagram.com/reel/DVPQODmCNBU/embed/"
                className="w-full border-0"
                style={{ height: '520px' }}
                allowFullScreen
                loading="lazy"
                title="Témoignage clients Immo-rama"
              />
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[hsl(38_45%_48%)] bg-[hsl(38_45%_48%/0.08)] rounded-full px-3 py-1.5 mb-3 border border-[hsl(38_45%_48%/0.2)]">
                <Play className="h-3 w-3" />
                <span>Vidéo de présentation</span>
              </div>
              <h3 className="text-lg font-bold text-foreground font-serif">Notre service en 1 minute 🎬</h3>
            </div>
            <div className="relative w-full rounded-2xl overflow-hidden bg-muted shadow-lg border border-[hsl(38_45%_48%/0.2)] hover:border-[hsl(38_45%_48%/0.4)] transition-colors duration-300">
              <iframe
                src="https://www.instagram.com/reel/DUf-zVlDDDv/embed/"
                className="w-full border-0"
                style={{ height: '520px' }}
                allowFullScreen
                loading="lazy"
                title="Vidéo de présentation Immo-rama"
              />
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
