import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Sparkles, Check, ArrowRight, MapPin, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicSiteLayout } from '@/components/public-site/PublicSiteLayout';
import squareAsset from '@/assets/chasseur-square.png.asset.json';
import portraitAsset from '@/assets/chasseur-portrait.png.asset.json';
import tallAsset from '@/assets/chasseur-tall.png.asset.json';

const PricingSection = lazy(() =>
  import('@/components/public-site/sections/PricingSection').then((m) => ({ default: m.PricingSection })),
);
const FAQSection = lazy(() =>
  import('@/components/public-site/sections/FAQSection').then((m) => ({ default: m.FAQSection })),
);

export default function ChasseurAppartement() {
  return (
    <PublicSiteLayout>
      <main className="pt-28 md:pt-32">
        {/* HERO */}
        <section className="imr-hero-bg relative overflow-hidden">
          <div className="container mx-auto px-4 py-12 md:py-20">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              {/* Left: copy */}
              <div className="order-2 md:order-1">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Achat &amp; Location
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.05] mb-5">
                  Chasseur d'appartement à Lausanne
                  <span className="block text-primary mt-2">et en Suisse romande</span>
                </h1>

                <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent rounded-full mb-6" />

                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl">
                  On recherche, on filtre, on visite, on signe — pendant que toi tu vis ta vie.
                  Activation immédiate, résultats en quelques semaines.
                </p>

                {/* Bullets */}
                <ul className="space-y-3 mb-10">
                  {[
                    { icon: Search, text: 'Trouve ton appartement en 1 clic' },
                    { icon: Bell, text: "Active ta recherche aujourd'hui" },
                    { icon: Shield, text: '90 jours garantis ou remboursé' },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="text-foreground font-medium">{text}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/30">
                    <Link to="/nouveau-mandat">
                      Activer ma recherche
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-primary/30 hover:bg-primary/5">
                    <Link to="/rendez-vous">Réserver un RDV gratuit</Link>
                  </Button>
                </div>
              </div>

              {/* Right: visual */}
              <div className="order-1 md:order-2 relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 ring-1 ring-primary/10">
                  <img
                    src={squareAsset.url}
                    alt="Chasseur d'appartement Immo-rama observant la ville"
                    className="w-full h-auto block"
                    fetchPriority="high"
                    width={1024}
                    height={1024}
                  />
                </div>
                {/* floating accent pills */}
                <div className="hidden md:flex absolute -bottom-4 -left-4 items-center gap-2 px-4 py-2 rounded-full bg-white shadow-lg ring-1 ring-primary/20">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">+500 clients servis</span>
                </div>
                <div className="hidden md:flex absolute -top-4 -right-4 items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-bold">N°1 en Romandie</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="bg-primary/5 border-y border-primary/15">
          <div className="container mx-auto px-4 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
              {[
                { value: '< 30j', label: 'Délai moyen' },
                { value: '+500', label: 'Clients placés' },
                { value: '90j', label: 'Garantie' },
                { value: '6 cantons', label: 'Couverture romande' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-3xl md:text-4xl font-bold text-primary tabular-nums">{s.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMMENT ÇA MARCHE — 3 étapes */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Processus</p>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Comment on chasse pour toi</h2>
              <p className="text-muted-foreground text-lg">Trois étapes, zéro friction.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  icon: MapPin,
                  step: '01',
                  title: 'Tu nous dis ce que tu cherches',
                  text: 'Localisation, budget, surface, pièces. On capte tes critères en 5 minutes via un formulaire intelligent.',
                },
                {
                  icon: Clock,
                  step: '02',
                  title: 'On chasse en continu',
                  text: 'Veille temps réel sur 6 portails suisses + notre réseau off-market. Tu reçois uniquement les biens validés.',
                },
                {
                  icon: Check,
                  step: '03',
                  title: 'On gère visites et dossier',
                  text: "Délégation possible des visites, dossier de candidature optimisé, suivi jusqu'à la signature du bail.",
                },
              ].map(({ icon: Icon, step, title, text }) => (
                <div
                  key={step}
                  className="group relative rounded-2xl bg-card border border-border p-7 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all"
                >
                  <div className="absolute top-7 right-7 text-5xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                    {step}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VISUAL SHOWCASE — 2 visuels */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-primary/15 ring-1 ring-primary/10">
                <img
                  src={portraitAsset.url}
                  alt="Chasseur d'appartement Immo-rama — vue panoramique"
                  loading="lazy"
                  className="w-full h-auto block"
                />
              </div>
              <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-primary/15 ring-1 ring-primary/10 md:translate-y-12">
                <img
                  src={tallAsset.url}
                  alt="Chasseur d'appartement Immo-rama — focus repérage"
                  loading="lazy"
                  className="w-full h-auto block"
                />
              </div>
            </div>
          </div>
        </section>

        {/* PRICING (réutilise le composant existant) */}
        <Suspense fallback={<div className="h-96" />}>
          <PricingSection />
        </Suspense>

        {/* FAQ */}
        <Suspense fallback={<div className="h-64" />}>
          <FAQSection />
        </Suspense>

        {/* CLOSING CTA */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden p-10 md:p-16 text-center bg-gradient-to-br from-primary to-primary/80">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white_0%,transparent_50%)]" />
              <div className="relative">
                <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
                  Prêt à trouver ton appartement&nbsp;?
                </h2>
                <p className="text-primary-foreground/90 text-lg mb-8 max-w-xl mx-auto">
                  Active ta recherche en 5 minutes. Premier bien validé sous 48h en moyenne.
                </p>
                <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-2xl">
                  <Link to="/nouveau-mandat">
                    Activer ma recherche maintenant
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicSiteLayout>
  );
}
