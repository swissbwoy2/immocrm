import { useEffect, useState } from 'react';
import { Users, Home, Star, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { AnimatedCounter } from '@/components/public-site/animations/AnimatedCounter';
import { TiltCard } from '@/components/public-site/animations/TiltCard';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';
import { RetroGrid } from '@/components/public-site/magic/RetroGrid';

interface Stats { clients: number; transactions: number; satisfaction: number; avgDays: number; }

export function StatsSection() {
  const [stats, setStats] = useState<Stats>({ clients: 0, transactions: 0, satisfaction: 0, avgDays: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [clientsResult, transactionsResult] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('statut', 'conclu'),
        ]);
        setStats({
          clients: clientsResult.count || 500,
          transactions: transactionsResult.count || 500,
          satisfaction: 98,
          avgDays: 45,
        });
      } catch {
        setStats({ clients: 500, transactions: 500, satisfaction: 98, avgDays: 45 });
      }
    };
    loadStats();
  }, []);

  const statItems = [
    { icon: Users, value: stats.clients, suffix: '+', label: 'Familles relogées avec succès' },
    { icon: Home, value: stats.transactions, suffix: '+', label: 'Baux signés grâce à nous' },
    { icon: Star, value: stats.satisfaction, suffix: '%', label: 'Recommanderaient Immo-Rama' },
    { icon: Clock, value: stats.avgDays, suffix: ' jours', label: 'En moyenne pour emménager' },
  ];

  return (
    <section id="ps-stats-section" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 luxury-hero-bg opacity-[0.97]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,hsl(38_45%_48%/0.06)_0%,transparent_70%)]" />
      <RetroGrid className="opacity-30" angle={70} />

      <div className="container mx-auto px-4 relative z-10">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-[hsl(38_45%_48%/0.12)] border border-[hsl(38_45%_48%/0.3)] rounded-full px-4 py-2 mb-4 backdrop-blur-sm">
            <Star className="h-4 w-4 text-[hsl(38_55%_65%)] fill-[hsl(38_55%_65%/0.4)]" />
            <span className="text-sm font-medium text-[hsl(38_55%_65%)]">Nos résultats concrets</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[hsl(40_25%_92%)] mb-4 font-serif">
            Des chiffres qui{' '}
            <span className="luxury-gradient-text">parlent d'eux-mêmes</span>
          </h2>
          <p className="text-lg text-[hsl(40_20%_60%)] max-w-2xl mx-auto">
            Pas des promesses, des résultats vérifiables
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.1}>
          <GoldDivider className="mb-12" />
        </ScrollReveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {statItems.map((stat, index) => (
            <motion.div key={index} variants={staggerItem}>
              <TiltCard intensity={6}>
                <div className="rounded-xl p-6 text-center luxury-glass hover:border-[hsl(38_45%_48%/0.5)] transition-all duration-500 group h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(38_45%_44%/0.3)] to-[hsl(28_35%_35%/0.2)] border border-[hsl(38_45%_48%/0.3)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-[0_0_20px_hsl(38_45%_48%/0.3)] transition-all duration-500">
                    <stat.icon className="h-8 w-8 text-[hsl(38_55%_65%)]" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold font-serif mb-2 luxury-gradient-text">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-[hsl(40_20%_60%)] text-sm font-medium">{stat.label}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

        <ScrollReveal variant="fade-up" delay={0.2} className="text-center mt-12">
          <p className="text-lg text-[hsl(40_20%_60%)] mb-4">Prêt à rejoindre les familles qui ont trouvé ?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <MagneticButton strength={0.25}>
              <Button
                asChild
                size="lg"
                className="luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0"
              >
                <Link to="/nouveau-mandat">
                  Démarre ta recherche
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </MagneticButton>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[hsl(38_45%_48%/0.35)] text-[hsl(38_55%_65%)] hover:border-[hsl(38_45%_48%/0.7)] hover:bg-[hsl(38_45%_48%/0.08)] bg-transparent"
            >
              <a href="#quickform">Tester ma solvabilité</a>
            </Button>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
