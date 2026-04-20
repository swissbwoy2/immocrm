import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowRight,
  CheckCircle,
  Crown,
  Bot,
  ClipboardCheck,
  Activity,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroBg from '@/assets/hero-bg.jpg';
import { LandingHamburgerMenu } from '@/components/landing/LandingHamburgerMenu';
import { ScrollExpansionHero } from '@/components/ui/scroll-expansion-hero';

export default function ConstruireRenover() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Rénovation intelligente par IA | Immo-Rama';
  }, []);

  const avant = [
    'Optimisation des plans et de la mise en valeur du bien',
    'Analyse détaillée de chaque devis',
    'Audit et comparaison des entreprises',
    'Classement des entreprises par étoiles',
    'Aide au choix des fournitures',
    'Analyse des prix chez différents fournisseurs',
    'Présélection de matériaux locaux et étrangers selon votre budget',
    'Accompagnement pour la demande de permis',
    'Contrôle des points sensibles comme l\'amiante',
    'Audit des canalisations',
    'Détection des risques techniques avant rénovation',
  ];

  const pendant = [
    'Suivi du chantier en temps réel',
    'Anticipation des retards',
    'Optimisation des coûts de rénovation',
    'Détection rapide des erreurs et incohérences',
    'Meilleure prise de décision à chaque étape',
    'Suivi centralisé de l\'avancement du projet',
    'Meilleure coordination globale entre les intervenants',
  ];

  const apres = [
    'Suivi 24h/24 et 7j/7 des nouvelles installations',
    'Suivi jusqu\'à l\'échéance des garanties',
    'Regroupement et centralisation des documents importants',
    'Meilleure traçabilité des interventions et équipements',
    'Conservation des éléments utiles pour le futur suivi du bien',
  ];

  const Section = ({
    icon: Icon,
    label,
    title,
    intro,
    items,
    accent,
  }: {
    icon: typeof ClipboardCheck;
    label: string;
    title: string;
    intro: string;
    items: string[];
    accent: string;
  }) => (
    <Card className="p-6 md:p-10 border-border/50 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className={`text-xs font-bold tracking-widest ${accent}`}>{label}</div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground">{title}</h3>
        </div>
      </div>
      <p className="text-muted-foreground mb-6 text-sm md:text-base">{intro}</p>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm md:text-base text-foreground">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <div className="theme-luxury min-h-screen bg-background">
      {/* Header fixe */}
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" aria-label="Retour à l'accueil" className="flex items-center gap-2">
            <img src={logoImmoRama} alt="Immo-Rama" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/">← Accueil</Link>
            </Button>
            <LandingHamburgerMenu />
          </div>
        </div>
      </header>

      <div className="pt-16">
        {/* HERO — scroll expansion */}
        <ScrollExpansionHero
          mediaSrc={heroBg}
          bgImageSrc={heroBg}
          mediaType="image"
          title="Rénovez plus intelligemment grâce à l'intelligence artificielle."
          scrollToExpand="Faites défiler pour découvrir"
        />

        {/* INTRO */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              L'IA au service de vos rénovations
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Nos outils suivent vos chantiers, anticipent les retards, optimisent les coûts,
              analysent les devis, comparent les fournisseurs et vous font réaliser des{' '}
              <strong className="text-foreground">économies considérables</strong> grâce à
              l'intelligence artificielle.
            </p>
          </div>
        </section>

        {/* 3 PHASES */}
        <section className="py-8 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-6xl space-y-8">
            <Section
              icon={ClipboardCheck}
              label="PHASE 1"
              title="Avant le chantier"
              intro="L'intelligence artificielle vous aide à préparer votre projet de manière beaucoup plus poussée."
              items={avant}
              accent="text-primary"
            />
            <Section
              icon={Activity}
              label="PHASE 2"
              title="Pendant le chantier"
              intro="Nos outils permettent un pilotage beaucoup plus précis et réactif."
              items={pendant}
              accent="text-amber-500"
            />
            <Section
              icon={ShieldCheck}
              label="PHASE 3"
              title="Après le chantier"
              intro="Le suivi ne s'arrête pas à la fin des travaux."
              items={apres}
              accent="text-green-500"
            />
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Ne rénovez plus à l'aveugle.
            </h2>
            <p className="text-muted-foreground text-base md:text-lg mb-3 leading-relaxed">
              Aujourd'hui, l'intelligence artificielle peut vous aider à mieux préparer, mieux
              piloter et mieux sécuriser votre rénovation, tout en vous faisant économiser des{' '}
              <strong className="text-foreground">milliers de francs</strong>.
            </p>
            <p className="text-primary font-semibold text-lg md:text-xl mb-8">
              Faites confiance à l'intelligence artificielle !
            </p>
            <Button
              asChild
              size="lg"
              className="text-base md:text-xl px-8 md:px-14 py-5 md:py-8 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
            >
              <Link to="/formulaire-construire-renover">
                <Sparkles className="mr-3 h-6 w-6" />
                Rénover maintenant
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </Button>
            <div className="mt-6">
              <Button asChild variant="ghost" size="sm">
                <Link to="/">← Retour à l'accueil</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
