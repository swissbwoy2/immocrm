import { MapPin, CheckCircle, Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { Scene3DWrapper } from '@/components/public-site/3d/Scene3DWrapper';
import { SwissGlobe3D } from '@/components/public-site/3d/SwissGlobe3D';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';

const cantons = ['Vaud', 'Genève', 'Valais', 'Fribourg', 'Neuchâtel', 'Jura'];

export function CoverageSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-muted/20">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">

          {/* Globe 3D */}
          <ScrollReveal variant="slide-right" className="hidden lg:block">
            <div className="relative w-full h-72">
              <Scene3DWrapper
                cameraPosition={[0, 0, 3]}
                fogNear={8}
                fogFar={20}
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <Globe className="h-32 w-32 text-[hsl(38_45%_48%/0.3)]" />
                  </div>
                }
              >
                <SwissGlobe3D />
              </Scene3DWrapper>
            </div>
          </ScrollReveal>

          {/* Content */}
          <div>
            <ScrollReveal variant="fade-up" className="mb-4">
              <div className="inline-flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-[hsl(38_45%_48%)]" />
                <span className="text-sm font-semibold text-[hsl(38_45%_48%)] uppercase tracking-wider">Couverture</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4 font-serif">
                Toute la{' '}
                <span className="luxury-gradient-text">Suisse Romande</span>
              </h2>
            </ScrollReveal>

            <GoldDivider className="mb-8" />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="flex flex-wrap gap-3 mb-6"
            >
              {cantons.map((canton) => (
                <motion.div key={canton} variants={staggerItem}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 border border-[hsl(38_45%_48%/0.2)] hover:border-[hsl(38_45%_48%/0.5)] hover:bg-[hsl(38_45%_48%/0.06)] transition-all duration-300 cursor-default">
                    <MapPin className="h-4 w-4 text-[hsl(38_45%_48%)]" />
                    <span className="font-medium text-foreground text-sm">{canton}</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <ScrollReveal variant="fade-up" delay={0.2}>
              <p className="text-muted-foreground mb-6 text-sm">
                +50 agences partenaires • Accès aux offres exclusives
              </p>
              <Button
                asChild
                variant="outline"
                className="group border-[hsl(38_45%_48%/0.35)] hover:border-[hsl(38_45%_48%/0.7)] hover:bg-[hsl(38_45%_48%/0.06)] text-[hsl(38_45%_44%)]"
              >
                <Link to="/nouveau-mandat">
                  Démarre ta recherche
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}
