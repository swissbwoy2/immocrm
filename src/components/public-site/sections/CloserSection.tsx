import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight, ShieldCheck, CheckCircle, Handshake, TrendingUp, Eye, CreditCard, Users, Building2, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { TiltCard } from '@/components/public-site/animations/TiltCard';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';
import { Scene3DWrapper } from '@/components/public-site/3d/Scene3DWrapper';
import { GoldKey3D } from '@/components/public-site/3d/GoldKey3D';

const benefits = [
  { icon: TrendingUp, title: "Jusqu'à 500 CHF par client", description: 'Touche ta commission pour chaque personne relogée grâce à ta recommandation.' },
  { icon: Eye, title: 'Dashboard partenaire dédié', description: 'Suis tes leads, leurs statuts et tes paiements en temps réel depuis ton espace perso.' },
  { icon: CreditCard, title: 'Paiement sous 15 jours', description: 'Virement direct sur ton compte dès la signature du bail. Rapide et sans paperasse.' },
];

const targetProfiles = [
  { icon: Building2, label: 'Agents immobiliers' },
  { icon: Users, label: 'RH & Entreprises' },
  { icon: Briefcase, label: 'Courtiers & Conciergeries' },
  { icon: Handshake, label: 'Coachs emploi & Influenceurs' },
];

export function CloserSection() {
  return (
    <section id="programme-partenaire" className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">

        {/* Final CTA */}
        <ScrollReveal variant="fade-up" className="max-w-2xl mx-auto text-center space-y-8 mb-24">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-serif">
            Prêt à trouver votre logement ?
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Rejoignez les +500 familles qui ont délégué leur recherche à nos experts. Résultat garanti ou remboursé.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-500" />Acompte 300 CHF</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-500" />90 jours garantis</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-green-500" />Remboursé si échec</span>
          </div>
          <MagneticButton strength={0.25}>
            <Button
              asChild
              size="lg"
              className="group luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] via-[hsl(38_55%_52%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0 text-base md:text-lg px-8 md:px-12 py-6"
            >
              <Link to="/nouveau-mandat">
                <Rocket className="h-5 w-5 mr-2" />
                Activer ma recherche maintenant
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </MagneticButton>
          <div>
            <a href="#comment-ca-marche" className="inline-flex items-center gap-2 text-sm text-[hsl(38_45%_48%)] hover:text-[hsl(38_55%_60%)] font-medium transition-colors">
              Voir comment ça marche<ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </ScrollReveal>

        <GoldDivider className="mb-16" />

        {/* Partner program */}
        <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
          <ScrollReveal variant="slide-left">
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="bg-[hsl(38_45%_48%/0.08)] border border-[hsl(38_45%_48%/0.25)] rounded-full px-5 py-2.5">
                <Handshake className="inline-block h-4 w-4 text-[hsl(38_45%_48%)] mr-2" />
                <span className="text-sm font-semibold text-[hsl(38_45%_48%)]">Programme partenaire</span>
              </div>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 font-serif">
              Transforme ton réseau en{' '}
              <span className="luxury-gradient-text">revenus passifs</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed max-w-lg">
              Tu connais quelqu'un qui galère à trouver un appart' ? Envoie-le nous et touche ta commission. Simple comme bonjour.
            </p>
            <div className="mb-8">
              <p className="text-sm font-medium text-foreground mb-3">💡 Parfait pour :</p>
              <div className="flex flex-wrap gap-2">
                {targetProfiles.map((profile, index) => (
                  <div key={index} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(38_45%_48%/0.06)] border border-[hsl(38_45%_48%/0.2)] text-sm text-muted-foreground hover:border-[hsl(38_45%_48%/0.4)] transition-colors">
                    <profile.icon className="h-4 w-4 text-[hsl(38_45%_48%)]" />
                    <span>{profile.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button asChild size="lg" className="luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0">
              <Link to="/login">
                <span>Devenir partenaire</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </ScrollReveal>

          {/* 3D Key (desktop) */}
          <div className="hidden lg:block lg:absolute lg:right-8 lg:top-8 w-36 h-36 pointer-events-none">
            <Scene3DWrapper
              cameraPosition={[0, 0, 3]}
              fogNear={6}
              fogFar={15}
            >
              <GoldKey3D />
            </Scene3DWrapper>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-6 md:space-y-8"
          >
            {benefits.map((benefit, index) => (
              <motion.div key={index} variants={staggerItem}>
                <TiltCard intensity={3}>
                  <div className="relative rounded-2xl p-6 md:p-8 group bg-card/80 border border-border/40 hover:border-[hsl(38_45%_48%/0.4)] hover:shadow-[0_8px_30px_hsl(38_45%_48%/0.08)] transition-all duration-500">
                    <div className="flex gap-5 md:gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[hsl(38_45%_48%/0.12)] to-[hsl(28_35%_35%/0.08)] border border-[hsl(38_45%_48%/0.2)] group-hover:border-[hsl(38_45%_48%/0.5)] flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_15px_hsl(38_45%_48%/0.2)]">
                          <benefit.icon className="h-8 w-8 text-[hsl(38_45%_48%)]" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 group-hover:text-[hsl(38_45%_44%)] transition-colors font-serif">
                          {benefit.title}
                        </h3>
                        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{benefit.description}</p>
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
    </section>
  );
}
