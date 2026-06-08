import { Button } from '@/components/ui/button';
import { ArrowRight, Key, Home, Sparkles } from 'lucide-react';
import { useSearchType } from '@/contexts/SearchTypeContext';
import heroCoupleKeys from '@/assets/hero-couple-keys.jpg';

export function DossierAnalyseSection() {
  const { setSearchType } = useSearchType();

  const openForm = (type: 'location' | 'achat') => {
    setSearchType(type);
    setTimeout(() => {
      const el = document.getElementById('etape-1-qualification');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <section id="analyse-dossier" className="relative overflow-hidden bg-[hsl(30_15%_5%)]">
      {/* HERO conversion */}
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(38_45%_48%/0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(38_45%_48%/0.08),transparent_50%)]" />
        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-7xl mx-auto">

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
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[hsl(40_30%_96%)] leading-[1.1]">
                  Nous aidons <span className="text-primary italic">nos clients</span> à trouver rapidement leur futur appartement en Suisse romande
                </h1>
                <p className="text-white/70 text-base md:text-lg max-w-xl leading-relaxed">
                  L'expertise Immo-rama.ch pour sécuriser ton dossier et emménager rapidement, partout en Suisse romande.
                </p>
              </div>

              {/* Trust cards translucides + gold blur */}
              <div className="relative grid sm:grid-cols-2 gap-4">
                <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                <div className="relative p-4 rounded-xl bg-white/5 backdrop-blur-md border border-primary/20 shadow-lg">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Commission</p>
                  <p className="text-white text-lg font-semibold">1 mois de loyer brut</p>
                  <p className="text-white/70 text-xs mt-1">Acompte 300.- remboursé à 100% si échec après 3 mois</p>
                </div>
                <div className="relative p-4 rounded-xl bg-white/5 backdrop-blur-md border border-primary/20 shadow-lg">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Confiance</p>
                  <p className="text-white text-lg font-semibold">500+ familles</p>
                  <p className="text-white/60 text-xs mt-1">Accompagnées avec succès</p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => openForm('location')}
                  className="group h-auto py-4 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)] hover:shadow-[0_10px_40px_-5px_hsl(var(--primary)/0.6)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Key className="h-5 w-5" />
                  <span className="text-base">Je cherche une location</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => openForm('achat')}
                  className="group h-auto py-4 px-6 bg-transparent border border-primary/40 hover:border-primary/70 hover:bg-primary/5 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Home className="h-5 w-5 text-primary" />
                  <span className="text-base">Je veux acheter un bien</span>
                </Button>
              </div>

              {/* Bouton RDV gratuit */}
              <a
                href="/nouveau-mandat"
                className="group inline-flex items-center justify-center gap-2 h-auto py-3 px-5 bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border border-primary/50 hover:border-primary text-primary font-semibold rounded-xl transition-all shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.4)] w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm uppercase tracking-wide">Réserver mon RDV au bureau gratuitement</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Bouton MAINTENANT */}
              <a
                href="/nouveau-mandat"
                className="group inline-flex items-center justify-center gap-2 h-auto py-3 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm uppercase tracking-wide">Active ta recherche MAINTENANT et décroche ton bail</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Colonne image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '120ms' }}>
              <div className="absolute -inset-6 bg-primary/15 blur-3xl rounded-full pointer-events-none" />
              <div className="relative overflow-hidden rounded-3xl border border-primary/20 shadow-2xl bg-card">
                <img
                  src={heroCoupleKeys}
                  alt="Couple heureux recevant les clés de leur appartement en Suisse romande grâce à Logisorama"
                  width={1024}
                  height={1024}
                  className="w-full aspect-[4/5] md:aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(30_15%_5%)] via-transparent to-transparent opacity-70" />

                {/* Floating card overlay */}
                <div className="absolute bottom-5 left-5 right-5 p-4 bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl flex items-center gap-4 shadow-xl">
                  <div className="flex -space-x-2">
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-gradient-to-br from-primary/60 to-primary/30" />
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-gradient-to-br from-primary/40 to-primary/20" />
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-gradient-to-br from-primary/30 to-primary/10" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-0.5">RDV gratuit</p>
                    <p className="text-xs md:text-sm text-white/90 font-medium leading-tight">
                      Réserve ton rendez-vous avec nos experts
                    </p>
                  </div>
                </div>

                {/* Decorative gold line */}
                <div className="absolute top-6 left-6 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-primary/30">
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Bureau de Crissier</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
