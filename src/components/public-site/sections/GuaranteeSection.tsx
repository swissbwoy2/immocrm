import { useRef } from 'react';
import { Shield, Wallet, CheckCircle, RefreshCcw, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { TiltCard } from '@/components/public-site/animations/TiltCard';
import { BorderBeam } from '@/components/public-site/magic/BorderBeam';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';

export function GuaranteeSection() {
  const { isAchat } = useSearchType();
  const shieldRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(shieldRef, { once: true, amount: 0.3 });
  const prefersReducedMotion = useReducedMotion();

  const pricingItemsLocation = [
    { icon: Wallet, label: 'Acompte', value: '300 CHF', description: '100% sécurisé' },
    { icon: CheckCircle, label: 'Succès', value: '1 mois de loyer', description: 'Moins les 300 CHF déjà versés' },
    { icon: RefreshCcw, label: 'Échec après 3 mois ?', value: 'Remboursement', description: 'Intégral. Sans condition.' },
  ];
  const pricingItemsAchat = [
    { icon: Wallet, label: 'Acompte', value: "2'500 CHF", description: 'Déduit de la commission finale' },
    { icon: CheckCircle, label: 'Commission', value: '1% du prix', description: "De l'achat, acompte déduit" },
    { icon: RefreshCcw, label: 'Échec après 6 mois ?', value: 'Remboursement', description: "Intégral des 2'500 CHF" },
  ];
  const pricingItems = isAchat ? pricingItemsAchat : pricingItemsLocation;

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-background via-[hsl(38_45%_48%/0.03)] to-background">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">

          <ScrollReveal variant="fade-up" className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-[hsl(38_45%_48%/0.08)] rounded-full px-4 py-2 mb-4 border border-[hsl(38_45%_48%/0.25)]">
              <Shield className="h-4 w-4 text-[hsl(38_45%_48%)]" />
              <span className="text-[hsl(38_45%_48%)] font-medium text-sm">💰 Tarification transparente</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-serif">
              {isAchat ? 'Commission transparente de 1% 🏡' : <>Tellement confiant qu'on te <span className="luxury-gradient-text">rembourse</span></>}
            </h2>
            <p className="text-muted-foreground">
              {isAchat ? "Acompte de 2'500 CHF déduit de ta commission finale." : 'Échec après 3 mois ? Remboursement intégral ! 💪'}
            </p>
          </ScrollReveal>

          <GoldDivider className="mb-10" />

          {/* Floating shield icon */}
          <div ref={shieldRef} className="flex justify-center mb-10">
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ type: 'spring' as const, stiffness: 180, damping: 20, delay: 0.1 }}
            >
              <motion.div
                animate={prefersReducedMotion ? {} : { y: [0, -10, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const }}
                className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(38_45%_44%/0.15)] to-[hsl(28_35%_35%/0.1)] border border-[hsl(38_45%_48%/0.4)] flex items-center justify-center"
                style={{ boxShadow: '0 0 32px hsl(38 45% 48% / 0.2), 0 0 8px hsl(38 45% 48% / 0.15)' }}
              >
                {/* Pulsing halo rings */}
                {!prefersReducedMotion && [0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-2xl border border-[hsl(38_45%_48%/0.3)]"
                    animate={{
                      scale: [1, 1.5 + i * 0.3],
                      opacity: [0.6, 0],
                    }}
                    transition={{ duration: 2, delay: i * 0.55, repeat: Infinity, ease: 'easeOut' as const }}
                  />
                ))}
                <Shield className="h-12 w-12 text-[hsl(38_55%_65%)]" />
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
          >
            {pricingItems.map((item, index) => (
              <motion.div key={index} variants={staggerItem}>
                <TiltCard intensity={4}>
                  <div className="relative rounded-2xl p-6 border border-[hsl(38_45%_48%/0.2)] hover:border-[hsl(38_45%_48%/0.45)] transition-all duration-500 h-full text-center bg-card/80 hover:shadow-[0_8px_30px_hsl(38_45%_48%/0.08)] group">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(38_45%_44%/0.2)] to-[hsl(28_35%_35%/0.15)] border border-[hsl(38_45%_48%/0.3)] flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-7 w-7 text-[hsl(38_45%_48%)]" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground mb-1 group-hover:text-[hsl(38_45%_44%)] transition-colors font-serif">{item.value}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          <ScrollReveal variant="fade-up" delay={0.2} className="mb-8">
            <div className="relative max-w-xl mx-auto rounded-2xl p-6 border border-[hsl(38_45%_48%/0.35)] bg-[hsl(38_45%_48%/0.05)] overflow-hidden">
              <BorderBeam duration={10} />
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-[hsl(38_45%_48%/0.1)] border border-[hsl(38_45%_48%/0.3)]">
                  <Shield className="h-8 w-8 text-[hsl(38_45%_48%)]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2 font-serif">
                    🛡️ {isAchat ? 'ACCOMPAGNEMENT COMPLET' : 'GARANTIE SÉRÉNITÉ'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {isAchat ? (
                      <>Mandat de <strong className="text-foreground">6 mois</strong> : on cherche activement ton bien idéal.<br /><strong className="text-foreground">Pas de bien trouvé ? Acompte de 2'500 CHF intégralement remboursé.</strong></>
                    ) : (
                      <>Après ta shortlist personnalisée, tu peux nous confier ta recherche pendant <strong className="text-foreground">90 jours</strong>.<br />Pas de bail signé ? <strong className="text-foreground">Remboursement intégral. Sans condition.</strong></>
                    )}
                  </p>
                  <Button asChild variant="outline" size="sm" className="group/btn border-[hsl(38_45%_48%/0.3)] hover:bg-[hsl(38_45%_48%/0.08)] text-[hsl(38_45%_44%)]">
                    <a href="/nouveau-mandat">
                      {isAchat ? "Démarrer ma recherche d'achat" : 'Découvrir le mandat 90 jours'}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={0.3} className="text-center">
            <div className="inline-flex flex-col items-center gap-3 bg-gradient-to-r from-[hsl(38_45%_48%/0.12)] via-[hsl(38_45%_48%/0.18)] to-[hsl(38_45%_48%/0.12)] border-2 border-[hsl(38_45%_48%/0.35)] rounded-2xl px-6 py-5">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-[hsl(38_55%_65%)]" />
                <span className="text-lg md:text-xl font-bold text-[hsl(38_45%_48%)] font-serif">
                  {isAchat ? 'Garantie remboursement 6 mois 🎯' : 'Garantie 100% remboursé 🎯'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isAchat ? '✓ Commission 1% • ✓ Acompte déduit • ✓ Remboursé si échec après 6 mois' : '✓ Zéro condition cachée • ✓ Remboursement sous 7 jours'}
              </p>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
