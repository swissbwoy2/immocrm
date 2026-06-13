import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicSiteLayout } from '@/components/public-site/PublicSiteLayout';
import heroVilla from '@/assets/public-site/hero-villa-immo.jpg';
import { ArrowRight } from 'lucide-react';

const PARCOURS = [
  { eyebrow: 'Je cherche à louer', title: 'Je cherche à louer', desc: 'Déposez votre mandat de recherche locative.', cta: 'Continuer', to: '/chasseur-appartement', secondary: { label: 'Voir nos annonces', to: '/annonces' } },
  { eyebrow: 'Je cherche à acheter', title: 'Je cherche à acheter', desc: 'Confiez-nous votre projet d\u2019acquisition.', cta: 'Continuer', to: '/vendre-mon-bien', secondary: { label: 'Voir nos annonces', to: '/annonces' } },
  { eyebrow: 'Je veux vendre', title: 'Je veux vendre', desc: 'Estimation et accompagnement.', cta: 'Continuer', to: '/vendre-mon-bien', secondary: { label: 'Notre approche', to: '/vendre-mon-bien' } },
  { eyebrow: 'Je remets mon appartement', title: 'Je remets mon\u00a0appartement à louer', desc: 'Reprise de bail rapide, gratuite.', cta: 'Continuer', to: '/relouer-mon-appartement', secondary: { label: 'Notre service relocation', to: '/relouer-mon-appartement' } },
  { eyebrow: 'Projet de construction', title: 'Projet de construction', desc: 'Promotion immobilière clé en main.', cta: 'Continuer', to: '/construire-renover', secondary: { label: 'Project management', to: '/construire-renover' } },
];

const SERVICES = [
  { num: '01', title: 'Achat — Vente', desc: 'Évaluation gratuite, mise en valeur, négociation et conseil sur mesure pour réussir votre achat ou votre vente en Suisse romande.' },
  { num: '02', title: 'Relogement & Première Acquisition', desc: 'Un agent dédié, une sélection ciblée et un suivi attentif pour trouver le logement qui vous ressemble.' },
  { num: '03', title: 'Relocation', desc: 'Reprise de bail express : trois dossiers solvables présentés. Un service entièrement gratuit pour les propriétaires.' },
  { num: '04', title: 'Project Management 360°', desc: 'Promotion clé en main : plans, permis, mise à l\u2019enquête, appels d\u2019offres, chantier et commercialisation.' },
];

const STATS = [
  { value: '+145', label: 'Clients relogés' },
  { value: '+300', label: 'Estimations' },
  { value: '+300', label: 'Offres proposées' },
  { value: '99\u202f%', label: 'Taux de satisfaction' },
];

export default function HomePage() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) return;
    if (loading || !user || !userRole) return;
    const target =
      userRole === 'admin' ? '/admin' :
      userRole === 'agent' ? '/agent' :
      userRole === 'client' ? '/client' :
      userRole === 'apporteur' ? '/apporteur' :
      null;
    if (target) {
      hasRedirected.current = true;
      navigate(target, { replace: true });
    }
  }, [user, userRole, loading, navigate]);

  return (
    <PublicSiteLayout>
      {/* ============== HERO ============== */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-secondary">
        <div className="absolute inset-0 z-0">
          <img
            src={heroVilla}
            alt="Intérieur d'une villa alpine en Suisse romande"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-primary/15" />
        </div>

        <div className="relative z-10 w-full">
          <div className="container mx-auto px-4 lg:px-6 py-12 md:py-20">
            <div className="max-w-2xl bg-background/95 backdrop-blur-sm p-8 md:p-14 shadow-2xl">
              <span className="block text-accent uppercase tracking-[0.22em] text-[11px] font-bold mb-4">
                Immo-Rama — Suisse romande
              </span>
              <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] text-foreground mb-6">
                L&apos;immobilier accessible.
              </h1>
              <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-8">
                Conseil personnalisé, sélection rigoureuse et accompagnement discret&nbsp;: nous
                orchestrons vos projets immobiliers en Suisse romande depuis 2016.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/annonces"
                  className="px-7 py-4 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-[11px] font-bold hover:bg-accent transition-colors"
                >
                  Découvrir nos biens
                </Link>
                <Link
                  to="/rendez-vous"
                  className="px-7 py-4 bg-accent text-accent-foreground uppercase tracking-[0.18em] text-[11px] font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Prendre rendez-vous
                </Link>
                <Link
                  to="/vendre-mon-bien"
                  className="px-7 py-4 border border-primary text-primary uppercase tracking-[0.18em] text-[11px] font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Estimation gratuite
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== PARCOURS ============== */}
      <section className="bg-background border-b border-border py-20 md:py-24">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-12 text-center">
            <span className="block text-accent uppercase tracking-[0.22em] text-[11px] font-bold mb-3">
              Par où commencer&nbsp;?
            </span>
            <h2 className="font-serif text-3xl md:text-5xl text-foreground">
              Choisissez votre parcours.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PARCOURS.map((p) => (
              <article
                key={p.title}
                className="flex flex-col bg-card border border-border p-6 hover:border-accent transition-colors group"
              >
                <h3 className="font-serif text-xl text-foreground mb-3 leading-snug">{p.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed mb-6 flex-1">{p.desc}</p>
                <Link
                  to={p.to}
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-foreground group-hover:text-accent transition-colors"
                >
                  {p.cta} <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  to={p.secondary.to}
                  className="mt-6 inline-flex items-center justify-center px-4 py-3 border border-border text-foreground/80 uppercase tracking-[0.16em] text-[10px] font-bold hover:bg-secondary transition-colors"
                >
                  {p.secondary.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============== SERVICES (dark) ============== */}
      <section className="bg-primary text-primary-foreground py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-14">
            <span className="block text-accent-foreground/70 uppercase tracking-[0.22em] text-[11px] font-bold mb-4">
              Nos services
            </span>
            <h2 className="font-serif text-3xl md:text-5xl max-w-3xl leading-tight">
              Un accompagnement complet, taillé pour vous.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            {SERVICES.map((s) => (
              <div key={s.num} className="border-t border-primary-foreground/20 pt-6">
                <div className="font-serif italic text-2xl text-primary-foreground/50 mb-4">{s.num}</div>
                <h3 className="uppercase tracking-[0.18em] text-xs font-bold mb-4">{s.title}</h3>
                <p className="text-sm text-primary-foreground/75 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== STATS ============== */}
      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-14">
            <span className="block text-accent uppercase tracking-[0.22em] text-[11px] font-bold mb-3">
              Immo-Rama
            </span>
            <h2 className="font-serif text-3xl md:text-5xl text-foreground">Stats</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-serif text-5xl md:text-7xl text-foreground leading-none mb-3">
                  {s.value}
                </div>
                <div className="uppercase tracking-[0.18em] text-[11px] font-bold text-foreground/60">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== SIGNATURE ============== */}
      <section className="bg-secondary py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <span className="block text-accent uppercase tracking-[0.22em] text-[11px] font-bold mb-4">
                Notre signature
              </span>
              <h2 className="font-serif italic text-4xl md:text-5xl text-foreground leading-[1.1] mb-8">
                Une vision exigeante de l&apos;immobilier.
              </h2>
              <div className="space-y-4 text-foreground/75 leading-relaxed">
                <p>
                  Vendre, acquérir, louer, valoriser ou orchestrer une promotion&nbsp;: chaque
                  mission est conduite avec méthode, écoute et la même attention au détail
                  qu&apos;on accorderait à son propre patrimoine.
                </p>
                <p>
                  Notre engagement&nbsp;: des solutions cousues main, une transparence totale et
                  une exécution qui transforme l&apos;intention en résultat.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center px-7 py-4 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-[11px] font-bold hover:bg-accent transition-colors"
              >
                Découvrir la maison
              </Link>
            </div>

            <blockquote className="bg-background p-10 md:p-12 border-l-2 border-accent">
              <p className="font-serif italic text-2xl md:text-3xl text-foreground leading-snug mb-6">
                «&nbsp;Faire gagner du temps, sécuriser chaque transaction et porter nos clients
                vers le bon logement — ou le bon acquéreur.&nbsp;»
              </p>
              <footer className="uppercase tracking-[0.18em] text-[11px] font-bold text-foreground/60">
                Christ Ramazani — Fondateur
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ============== CTA estimation ============== */}
      <section className="bg-accent/40 py-20 md:py-24">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="font-serif text-3xl md:text-5xl text-foreground max-w-3xl mx-auto leading-tight mb-4">
            Connaissez la juste valeur de votre bien.
          </h2>
          <p className="text-foreground/75 max-w-xl mx-auto mb-8">
            Estimation confidentielle, sans engagement — réponse sous 24&nbsp;h ouvrées.
          </p>
          <Link
            to="/vendre-mon-bien"
            className="inline-flex items-center px-8 py-4 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-[11px] font-bold hover:bg-foreground transition-colors"
          >
            Demander mon estimation
          </Link>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
