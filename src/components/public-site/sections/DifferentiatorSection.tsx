import { useState } from 'react';
import { CheckCircle, X, Shield, Search, Users, Filter, Calendar, FileText, MessageSquare, Brain, Eye, ArrowRight, Crown, ChevronDown, ChevronUp, Home, Handshake, Landmark, PiggyBank, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { BorderBeam } from '@/components/public-site/magic/BorderBeam';
import { staggerContainer, staggerItem } from '@/hooks/useScrollReveal';

const shortComparisonDataLocation = [
  { aspect: 'Tu visites moins, mais mieux', logisorama: 'On identifie les opportunités réalistes selon ton profil. Chaque proposition est ciblée.', solo: 'Tu postules sans savoir si tu as une chance.', icon: Filter },
  { aspect: 'Ton dossier passe devant', logisorama: 'Ton dossier est recommandé directement à nos contacts régies.', solo: 'Ta candidature arrive anonyme parmi des dizaines.', icon: Users },
  { aspect: 'Tu sais où tu en es', logisorama: 'Conseiller dédié et reporting régulier chaque semaine.', solo: 'Tu envoies et tu attends... souvent sans retour.', icon: Eye },
  { aspect: 'Zéro risque', logisorama: 'Pas de bail en 90 jours ? Remboursement intégral.', solo: 'Tout le risque repose sur toi.', icon: Shield },
];
const fullComparisonDataLocation = [
  { aspect: 'Accès aux biens', logisorama: 'Profite de notre Réseau Privilégié : régies partenaires + proprios privés.', solo: 'Tu vois que les annonces publiques, déjà consultées par des centaines.', icon: Search },
  { aspect: 'Coordination des visites', logisorama: 'On organise tout : créneaux optimisés, préparation du dossier.', solo: 'Tu contactes chaque régie séparément, souvent trop tard.', icon: Calendar },
  { aspect: 'Dossier professionnel', logisorama: 'Un dossier complet, aligné avec les standards des régies.', solo: "Tu improvises sans connaître les attentes des décideurs.", icon: FileText },
  { aspect: 'Suivi personnalisé', logisorama: 'On relance les régies pour obtenir des réponses rapides.', solo: 'Tu envoies et tu attends... souvent sans aucun retour.', icon: MessageSquare },
  { aspect: 'Efficacité & sérénité', logisorama: 'Tu délègues à une équipe expérimentée. Toi, tu respires.', solo: 'Tu gères seul la recherche et le stress. Épuisant.', icon: Brain },
];
const shortComparisonDataAchat = [
  { aspect: 'Accès off-market', logisorama: 'Biens exclusifs avant publication, réseau de vendeurs privés.', solo: 'Que les annonces publiques, déjà vues par tout le monde.', icon: Key },
  { aspect: 'Négociation experte', logisorama: 'On négocie le prix pour toi avec notre expertise du marché.', solo: 'Tu fais face seul aux vendeurs, sans savoir les prix réels.', icon: Handshake },
  { aspect: 'Financement optimisé', logisorama: 'Partenaires bancaires pour les meilleurs taux hypothécaires.', solo: 'Tu démarches seul les banques, sans pouvoir de négociation.', icon: Landmark },
  { aspect: 'Commission transparente', logisorama: "1% du prix d'achat, acompte de 2'500 CHF déduit. Remboursé après 6 mois.", solo: "Tu paies 3-5% de commission à l'agence, sans garantie.", icon: PiggyBank },
];
const fullComparisonDataAchat = [
  { aspect: 'Évaluation du bien', logisorama: 'Analyse complète : état, charges, potentiel, risques cachés.', solo: 'Tu te fies à la description du vendeur, souvent incomplète.', icon: Search },
  { aspect: 'Accompagnement notarial', logisorama: "On t'accompagne jusqu'à la signature chez le notaire.", solo: 'Tu découvres les documents le jour de la signature.', icon: FileText },
  { aspect: 'Coordination des visites', logisorama: 'Visites organisées selon tes disponibilités, avec briefing.', solo: "Tu t'adaptes aux horaires des vendeurs, sans préparation.", icon: Calendar },
  { aspect: 'Suivi personnalisé', logisorama: 'Un conseiller dédié qui connaît ton projet en détail.', solo: "Tu gères seul avec des interlocuteurs différents à chaque fois.", icon: Users },
  { aspect: 'Sérénité totale', logisorama: 'De la recherche à la remise des clés, on gère tout.', solo: 'Stress, paperasse, délais... tout repose sur toi.', icon: Home },
];

export function DifferentiatorSection() {
  const [showMore, setShowMore] = useState(false);
  const { isAchat } = useSearchType();

  const shortData = isAchat ? shortComparisonDataAchat : shortComparisonDataLocation;
  const fullData = isAchat ? fullComparisonDataAchat : fullComparisonDataLocation;
  const displayData = showMore ? [...shortData, ...fullData] : shortData;

  const content = {
    subtitle: isAchat
      ? 'Nous travaillons POUR toi, en collaboration avec les vendeurs et notaires.'
      : 'Nous travaillons POUR toi, en collaboration avec les régies et les propriétaires.',
    cta: isAchat ? 'Trouver mon bien !' : 'Je me lance !',
    ctaLink: isAchat ? '#quickform' : '/nouveau-mandat',
    guarantee: isAchat
      ? "Commission 1% • Acompte 2'500 CHF déduit • Remboursé après 6 mois"
      : '90 jours pour trouver • Remboursement intégral si échec',
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-[hsl(30_15%_8%)] to-[hsl(30_15%_10%)]">
      {/* Subtle gold radials */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[hsl(38_45%_48%/0.04)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[hsl(28_35%_35%/0.05)] rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="bg-[hsl(38_45%_48%/0.1)] border border-[hsl(38_45%_48%/0.35)] rounded-full px-5 py-2.5 backdrop-blur-sm">
              <Crown className="inline-block h-4 w-4 text-[hsl(38_55%_65%)] mr-2" />
              <span className="text-sm font-semibold text-[hsl(38_55%_65%)] tracking-wide">Accès Privilégié</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[hsl(40_25%_92%)] mb-4 leading-tight font-serif">
            Pas une agence comme{' '}
            <span className="luxury-gradient-text">les autres</span>
          </h2>
          <p className="text-base text-[hsl(40_20%_60%)] max-w-2xl mx-auto leading-relaxed">
            {content.subtitle.split('POUR toi')[0]}
            <strong className="text-[hsl(40_25%_82%)]">POUR toi</strong>
            {content.subtitle.split('POUR toi')[1]}
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.1}>
          <GoldDivider className="mb-12" />
        </ScrollReveal>

        <div className="max-w-5xl mx-auto">
          {/* Desktop */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-4 mb-4">
              <div className="p-4" />
              <div className="relative rounded-2xl p-5 bg-[hsl(38_45%_48%/0.08)] border border-[hsl(38_45%_48%/0.35)] overflow-hidden">
                <BorderBeam duration={8} />
                <div className="flex items-center justify-center gap-3">
                  <Crown className="h-5 w-5 text-[hsl(38_55%_65%)]" />
                  <h3 className="text-base font-bold text-[hsl(40_25%_92%)] font-serif">Avec Immo-rama.ch</h3>
                </div>
              </div>
              <div className="relative rounded-2xl p-5 bg-[hsl(0_0%_100%/0.03)] border border-[hsl(0_0%_100%/0.08)]">
                <div className="flex items-center justify-center gap-3">
                  <X className="h-5 w-5 text-[hsl(0_0%_40%)]" />
                  <h3 className="text-base font-bold text-[hsl(0_0%_50%)]">Recherche solo</h3>
                </div>
              </div>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              className="space-y-3"
            >
              {displayData.map((row, index) => (
                <motion.div key={index} variants={staggerItem} className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-4 group">
                  <div className="flex items-center gap-3 p-3">
                    <div className="p-2.5 rounded-xl bg-[hsl(38_45%_48%/0.1)] border border-[hsl(38_45%_48%/0.2)] group-hover:border-[hsl(38_45%_48%/0.4)] transition-all flex-shrink-0">
                      <row.icon className="h-4 w-4 text-[hsl(38_45%_48%)]" />
                    </div>
                    <span className="font-semibold text-[hsl(40_25%_85%)] text-sm">{row.aspect}</span>
                  </div>
                  <div className="rounded-xl p-4 bg-[hsl(38_45%_48%/0.06)] border border-[hsl(38_45%_48%/0.2)] group-hover:border-[hsl(38_45%_48%/0.35)] transition-all">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[hsl(40_20%_75%)] leading-relaxed">{row.logisorama}</span>
                    </div>
                  </div>
                  <div className="rounded-xl p-4 bg-[hsl(0_0%_100%/0.02)] border border-[hsl(0_0%_100%/0.05)]">
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 text-red-500/60 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[hsl(0_0%_45%)] leading-relaxed">{row.solo}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Mobile */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="md:hidden space-y-4"
          >
            {displayData.map((row, index) => (
              <motion.div key={index} variants={staggerItem} className="relative rounded-2xl overflow-hidden bg-[hsl(30_15%_12%)] border border-[hsl(38_45%_48%/0.15)]">
                <div className="px-4 py-3 border-b border-[hsl(38_45%_48%/0.1)] flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[hsl(38_45%_48%/0.1)]">
                    <row.icon className="h-4 w-4 text-[hsl(38_45%_48%)]" />
                  </div>
                  <span className="font-semibold text-[hsl(40_25%_85%)] text-sm">{row.aspect}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[hsl(38_45%_48%/0.06)] border border-[hsl(38_45%_48%/0.2)]">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[hsl(40_20%_75%)]">{row.logisorama}</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[hsl(0_0%_100%/0.02)] border border-[hsl(0_0%_100%/0.05)]">
                    <X className="h-4 w-4 text-red-500/60 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[hsl(0_0%_45%)]">{row.solo}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="flex justify-center mt-8">
            <Button
              variant="ghost"
              onClick={() => setShowMore(!showMore)}
              className="text-[hsl(38_45%_55%)] hover:text-[hsl(38_55%_70%)] hover:bg-[hsl(38_45%_48%/0.08)] gap-2"
            >
              {showMore ? (<>Voir moins<ChevronUp className="h-4 w-4" /></>) : (<>Voir le comparatif complet<ChevronDown className="h-4 w-4" /></>)}
            </Button>
          </div>
        </div>

        {/* CTA bottom card */}
        <ScrollReveal variant="fade-up" delay={0.2} className="mt-16 text-center">
          <div className="relative max-w-3xl mx-auto rounded-2xl md:rounded-3xl p-8 md:p-12 bg-[hsl(38_45%_48%/0.06)] border border-[hsl(38_45%_48%/0.25)] overflow-hidden">
            <BorderBeam duration={10} colorFrom="hsl(38 55% 65%)" colorTo="hsl(28 35% 38%)" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,hsl(38_45%_48%/0.04),transparent)]" />
            <div className="relative">
              <h3 className="text-2xl md:text-4xl font-bold text-[hsl(40_25%_92%)] mb-3 font-serif">
                La différence est claire 🎯
              </h3>
              <p className="text-[hsl(40_20%_60%)] mb-8 max-w-xl mx-auto leading-relaxed">
                Avec Immo-rama.ch, l'immobilier devient accessible et une équipe expérimentée défend tes intérêts.
              </p>
              <MagneticButton strength={0.2}>
                {isAchat ? (
                  <a href={content.ctaLink}>
                    <Button size="lg" className="luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0 text-base px-10 py-6">
                      {content.cta} 🏠 <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </a>
                ) : (
                  <Button asChild size="lg" className="luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0 text-base px-10 py-6">
                    <Link to={content.ctaLink}>{content.cta} 🚀 <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                )}
              </MagneticButton>
              <p className="mt-5 text-sm text-[hsl(40_20%_50%)]">{content.guarantee}</p>
            </div>
          </div>
          <p className="mt-6 text-xs text-[hsl(40_20%_40%)]">* Plus de 500 mandats confiés avec succès en Suisse romande depuis 2016</p>
        </ScrollReveal>

      </div>
    </section>
  );
}
