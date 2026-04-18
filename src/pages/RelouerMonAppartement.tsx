import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Home, Users, ShieldCheck, CheckCircle, Crown, Search, FileCheck, Sparkles } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroBg from '@/assets/hero-bg.jpg';
import { LandingHamburgerMenu } from '@/components/landing/LandingHamburgerMenu';

export default function RelouerMonAppartement() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Relouer mon appartement | Immo-Rama";
  }, []);

  const steps = [
    { icon: Home, title: 'Vous nous confiez votre bien', desc: 'Adresse, loyer souhaité, dates de disponibilité.' },
    { icon: Search, title: 'Nous trouvons le locataire idéal', desc: 'Sélection rigoureuse parmi notre base de +500 candidats vérifiés.' },
    { icon: FileCheck, title: 'Dossier complet pour la régie', desc: 'Vous recevez un dossier prêt à présenter à votre régie/propriétaire.' },
    { icon: Sparkles, title: 'Vous êtes libéré du bail', desc: 'Sortie anticipée sans frais grâce à un repreneur solvable.' },
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
              <span className="text-xs md:text-base font-semibold text-amber-500">Sortie de bail facilitée • Repreneur garanti</span>
            </div>

            <img src={logoImmoRama} alt="Immo-Rama" className="h-16 md:h-28 w-auto drop-shadow-2xl mb-4" />

            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              Vous quittez votre appartement ? <br />
              <span className="text-primary">Nous trouvons votre repreneur.</span>
            </h1>

            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mb-6 leading-relaxed">
              Confiez-nous la <strong className="text-foreground">recherche d'un locataire solvable</strong> pour reprendre votre bail.
              Vous évitez les pénalités et libérez votre logement sereinement.
            </p>

            <div className="rounded-xl px-4 md:px-8 py-3 md:py-5 border-2 border-green-500/50 bg-green-500/10 shadow-lg mb-6">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
                <span className="text-base md:text-2xl font-bold text-foreground">
                  Repreneur trouvé en moyenne en 21 jours
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button asChild size="lg" className="group text-base md:text-xl px-8 md:px-14 py-5 md:py-8 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105">
                <Link to="/formulaire-relouer">
                  <Home className="mr-3 h-6 w-6" />
                  <span className="font-bold">Trouver mon repreneur</span>
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </Link>
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />Sans frais initial</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />Locataires pré-vérifiés</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />Dossier prêt pour la régie</span>
              </div>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/40">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">+200 baux repris</span> avec succès en 2025
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
              Comment ça marche ?
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Un parcours simple, transparent, sans engagement.
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
            Prêt à libérer votre appartement ?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg mb-8">
            Remplissez le formulaire en 3 minutes — nous vous recontactons sous 24h.
          </p>
          <Button asChild size="lg" className="text-base md:text-xl px-8 md:px-14 py-5 md:py-8">
            <Link to="/formulaire-relouer">
              Commencer gratuitement
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
