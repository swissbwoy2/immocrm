import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Megaphone } from 'lucide-react';

const StoriesShowcaseSection = lazy(() =>
  import('./StoriesShowcaseSection').then((m) => ({ default: m.StoriesShowcaseSection }))
);

export function DossierAnalyseSection() {


  return (
    <section id="analyse-dossier" className="relative overflow-hidden bg-background">
      {/* HERO conversion */}
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.06),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.05),transparent_50%)]" />
        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="max-w-3xl mx-auto">


            {/* Colonne texte */}
            <div className="flex flex-col gap-7 text-left animate-fade-in">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-primary text-[10px] md:text-xs font-semibold tracking-[0.18em] uppercase">
                  Recherche d'appartement · Suisse Romande
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1]">
                  Nous aidons <span className="text-primary italic">nos clients</span> à trouver rapidement leur futur appartement en Suisse romande
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
                  L'expertise Immo-rama.ch pour sécuriser ton dossier et emménager rapidement, partout en Suisse romande.
                </p>
              </div>

              {/* Stories publiques — biens traités en direct */}
              <Suspense fallback={null}>
                <StoriesShowcaseSection />
              </Suspense>

              {/* Accès au portail d'annonces */}
              <div className="flex justify-center w-full">
                <Link
                  to="/annonces"
                  className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]"
                >
                  <Megaphone className="h-5 w-5" />
                  Accéder au portail
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Trust cards */}

              <div className="relative grid sm:grid-cols-2 gap-4">
                <div className="relative p-4 rounded-xl bg-card border border-primary/20 shadow-sm">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Commission</p>
                  <p className="text-foreground text-lg font-semibold">1 mois de loyer brut</p>
                  <p className="text-muted-foreground text-xs mt-1">Acompte 300.- remboursé à 100% si échec après 3 mois</p>
                </div>
                <div className="relative p-4 rounded-xl bg-card border border-primary/20 shadow-sm">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Confiance</p>
                  <p className="text-foreground text-lg font-semibold">500+ familles</p>
                  <p className="text-muted-foreground text-xs mt-1">Accompagnées avec succès</p>
                </div>
              </div>



              {/* Boutons CTA */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <a
                  href="/nouveau-mandat"
                  className="group inline-flex items-center justify-center gap-2 h-auto py-3 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] w-full sm:w-auto"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm uppercase tracking-wide">Active ta recherche MAINTENANT et décroche ton bail</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <Link
                  to="/inscription-annonceur"
                  className="group inline-flex items-center justify-center gap-2 h-auto py-3 px-5 rounded-xl border-2 border-primary/40 hover:border-primary bg-transparent hover:bg-primary/10 text-primary font-semibold transition-all w-full sm:w-auto"
                >
                  <Megaphone className="h-4 w-4" />
                  <span className="text-sm uppercase tracking-wide">Déposer une annonce</span>
                </Link>
              </div>
            </div>


          </div>
        </div>
      </div>
    </section>
  );
}
