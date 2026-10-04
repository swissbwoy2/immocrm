import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Megaphone } from "lucide-react";

const StoriesShowcaseSection = lazy(() =>
  import("./StoriesShowcaseSection").then((m) => ({ default: m.StoriesShowcaseSection })),
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
              {/* Headline */}
              <div className="space-y-4">
                <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1]">
                  Nous aidons <span className="text-primary italic">nos clients</span> à trouver rapidement leur futur
                  appartement en Suisse romande
                </h2>
                <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
                  L'expertise Immo-rama.ch pour sécuriser ton dossier et emménager rapidement, partout en Suisse
                  romande.
                </p>
              </div>

              {/* Stories publiques — biens traités en direct */}
              <Suspense fallback={null}>
                <StoriesShowcaseSection />
              </Suspense>

              {/* Accès au portail d'annonces */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                <Link
                  to="/annonces"
                  className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]"
                >
                  <Megaphone className="h-5 w-5" />
                  Voir les annonces
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/inscription-annonceur"
                  className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl border-2 border-primary/40 hover:border-primary bg-transparent hover:bg-primary/10 text-primary font-semibold text-base transition-all"
                >
                  <Megaphone className="h-5 w-5" />
                  Déposer une annonce
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
