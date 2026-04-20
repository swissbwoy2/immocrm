import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Home, Users, ShieldCheck, CheckCircle, Crown, Search, FileCheck, Sparkles } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroBg from '@/assets/hero-bg.jpg';
import { LandingHamburgerMenu } from '@/components/landing/LandingHamburgerMenu';
import { ScrollExpansionHero } from '@/components/ui/scroll-expansion-hero';

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
      {/* HERO — scroll expansion */}
      <ScrollExpansionHero
        mediaSrc={heroBg}
        bgImageSrc={heroBg}
        mediaType="image"
        title="Vous quittez votre appartement ? Nous trouvons votre repreneur."
        scrollToExpand="Faites défiler pour découvrir"
      />

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
