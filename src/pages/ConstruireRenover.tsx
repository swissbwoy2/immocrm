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
        {/* HERO */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img src={heroBg} alt="" className="w-full h-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/85 to-background/95" />
          </div>

          <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-full px-3 py-1.5 md:px-5 md:py-2.5 mb-4">
                <Crown className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                <span className="text-xs md:text-base font-semibold text-amber-500">
                  🚧 Rénovation intelligente • Pilotée par IA 🚧
                </span>
              </div>

              <img
                src={logoImmoRama}
                alt="Immo-Rama"
                className="h-16 md:h-28 w-auto drop-shadow-2xl mb-4"
              />

              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                Rénovez plus intelligemment <br />
                <span className="text-primary">grâce à l'intelligence artificielle.</span>
              </h1>

              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mb-6 leading-relaxed">
                Réduisez les erreurs, <strong className="text-foreground">optimisez vos coûts</strong>{' '}
                et anticipez les retards grâce à l'IA et aux nouvelles technologies.
              </p>

              <div className="rounded-xl px-4 md:px-8 py-3 md:py-5 border-2 border-primary/40 bg-primary/10 shadow-lg mb-6 max-w-3xl">
                <div className="flex items-start md:items-center gap-3">
                  <Bot className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0 mt-1 md:mt-0" />
                  <p className="text-sm md:text-base text-foreground text-left md:text-center">
                    Un <strong>agent IA connecté 24h/24 et 7j/7</strong> suit votre projet{' '}
                    <strong>avant, pendant et après</strong> le chantier pour prévenir les erreurs
                    coûteuses.
                  </p>
                </div>
              </div>

              <Button
                asChild
                size="lg"
                className="group text-base md:text-xl px-8 md:px-14 py-5 md:py-8 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
              >
                <Link to="/formulaire-construire-renover">
                  <Sparkles className="mr-3 h-6 w-6" />
                  <span className="font-bold">Rénover maintenant</span>
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </Link>
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-4">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Devis gratuit
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  IA 24h/24 · 7j/7
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Économies garanties
                </span>
              </div>
            </div>
          </div>
        </section>

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
