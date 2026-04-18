import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Hammer, Ruler, Palette, Wrench, ShieldCheck, CheckCircle, Crown, Users } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroBg from '@/assets/hero-bg.jpg';

export default function ConstruireRenover() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Construire & Rénover | Immo-Rama";
  }, []);

  const steps = [
    { icon: Ruler, title: 'Étude de votre projet', desc: 'Analyse gratuite de faisabilité, estimation du budget et planning.' },
    { icon: Palette, title: 'Sélection des artisans', desc: 'Mise en relation avec notre réseau d\'artisans partenaires certifiés.' },
    { icon: Hammer, title: 'Suivi de chantier', desc: 'Coordination des travaux, contrôle qualité et respect du budget.' },
    { icon: Wrench, title: 'Livraison clé en main', desc: 'Réception de chantier et garantie travaux sur 10 ans.' },
  ];

  return (
    <div className="theme-luxury min-h-screen bg-background">
      {/* Header fixe avec retour accueil */}
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" aria-label="Retour à l'accueil" className="flex items-center gap-2">
            <img src={logoImmoRama} alt="Immo-Rama" className="h-8 w-auto" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">← Accueil</Link>
          </Button>
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
              <span className="text-xs md:text-base font-semibold text-amber-500">Réseau d'artisans certifiés • Suivi de A à Z</span>
            </div>

            <img src={logoImmoRama} alt="Immo-Rama" className="h-16 md:h-28 w-auto drop-shadow-2xl mb-4" />

            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              Construire ou rénover ? <br />
              <span className="text-primary">Nous orchestrons votre projet.</span>
            </h1>

            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mb-6 leading-relaxed">
              De la conception à la livraison, profitez d'un <strong className="text-foreground">accompagnement clé en main</strong>
              {' '}et d'un réseau d'artisans suisses sélectionnés pour leur fiabilité.
            </p>

            <div className="rounded-xl px-4 md:px-8 py-3 md:py-5 border-2 border-green-500/50 bg-green-500/10 shadow-lg mb-6">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
                <span className="text-base md:text-2xl font-bold text-foreground">
                  Devis gratuit sous 7 jours
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button asChild size="lg" className="group text-base md:text-xl px-8 md:px-14 py-5 md:py-8 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105">
                <Link to="/formulaire-construire-renover">
                  <Hammer className="mr-3 h-6 w-6" />
                  <span className="font-bold">Lancer mon projet</span>
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </Link>
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />Devis gratuit</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />Artisans certifiés</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />Garantie 10 ans</span>
              </div>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/40">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">+80 chantiers livrés</span> en Suisse romande
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Notre méthode
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              4 étapes pour transformer votre projet en réalité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-background rounded-2xl p-6 border border-border/40 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-xs font-semibold text-primary mb-2">ÉTAPE {idx + 1}</div>
                <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Prêt à concrétiser votre projet ?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg mb-8">
            Décrivez votre projet en 3 minutes — un expert vous rappelle sous 48h.
          </p>
          <Button asChild size="lg" className="text-base md:text-xl px-8 md:px-14 py-5 md:py-8">
            <Link to="/formulaire-construire-renover">
              Demander mon devis gratuit
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
