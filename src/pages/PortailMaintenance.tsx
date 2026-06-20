import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Rocket, CalendarCheck, Home, ArrowRight } from 'lucide-react';
import { LandingFormShell } from '@/components/forms-premium/LandingFormShell';

export default function PortailMaintenance() {
  useEffect(() => {
    document.title = 'Portail annonces en maintenance — Logisorama';

    // noindex pour cette page de maintenance
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    const previous = robots.getAttribute('content');
    robots.setAttribute('content', 'noindex,nofollow');

    return () => {
      if (previous) robots.setAttribute('content', previous);
      else robots.remove();
    };
  }, []);

  return (
    <LandingFormShell>
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-lg shadow-black/5 p-8 md:p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 mb-6">
              <Wrench className="h-7 w-7 text-primary" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-5">
              <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
                Maintenance
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              Portail annonces en maintenance
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-3">
              Notre portail d'annonces est actuellement en cours d'amélioration afin de
              vous proposer une expérience plus claire, plus rapide et plus fiable.
            </p>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
              En attendant, vous pouvez activer votre recherche avec Logisorama ou
              contacter directement notre équipe.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                to="/nouveau-mandat"
                className="group inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Rocket className="h-5 w-5" />
                Activer ma recherche
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/rendez-vous"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold transition-all"
              >
                <CalendarCheck className="h-5 w-5" />
                Prendre rendez-vous
              </Link>

              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                <Home className="h-4 w-4" />
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingFormShell>
  );
}
