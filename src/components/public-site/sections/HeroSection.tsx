import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Crown, Key, Home, Rocket, ShieldCheck, ArrowRight, CheckCircle, Lock, Users, FileSearch, Building2, Hammer, KeyRound } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroChasseurAsset from '@/assets/hero-chasseur-split.png.asset.json';
import heroChasseurMobileAsset from '@/assets/hero-chasseur-mobile-916.png.asset.json';
const heroBg = heroChasseurAsset.url;
const heroBgMobile = heroChasseurMobileAsset.url;
import { useSearchType } from '@/contexts/SearchTypeContext';
import { motion, useReducedMotion } from 'framer-motion';
import { GrainOverlay } from '@/components/public-site/animations/GrainOverlay';
import { WordReveal } from '@/components/public-site/animations/WordReveal';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { Meteors } from '@/components/public-site/magic/Meteors';

// Services propriétaires — externalisés vers Immo-rama.ch
const parcours = [
  { href: 'https://logisorama.ch/relouer-mon-appartement', icon: KeyRound, label: 'Mettre en location' },
  { href: 'https://immo-rama.ch/vendre-mon-bien', icon: Building2, label: 'Vendre mon bien' },
  { href: 'https://immo-rama.ch/project-management', icon: Hammer, label: 'Construire & rénover' },
];

export function HeroSection() {
  const { searchType, setSearchType, isLocation, isAchat } = useSearchType();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative bg-background overflow-hidden luxury-grain">
      {/* Static hero background image (desktop + mobile) */}
      <picture className="absolute inset-0 -z-10">
        <source media="(max-width: 768px)" srcSet={heroBgMobile} />
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
      </picture>
      <div className="absolute inset-0 bg-background/85 -z-10" aria-hidden="true" />

      {/* Decorative elements */}
        <GrainOverlay opacity={0.03} />
        <Meteors number={12} className="z-[1]" />

        {/* Dark gradient transition from expansion */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none z-[2]" />

        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

            {/* Badge N°1 */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-3 md:mb-5"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 backdrop-blur-sm">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs md:text-sm font-semibold text-primary tracking-wide">
                  ⭐ Agence N°1 de relocation en Suisse romande • Chasseur premium
                </span>
              </div>
            </motion.div>

            {/* Logo */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
              className="mb-3 md:mb-5"
            >
              <img
                src={logoImmoRama}
                alt="Immo-Rama"
                className="h-16 md:h-32 w-auto drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 24px hsl(var(--primary)))' }}
              />
            </motion.div>

            {/* Slogan */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-4 md:mb-7"
            >
              <span className="text-base md:text-xl font-semibold tracking-widest uppercase text-primary"
                style={{ letterSpacing: '0.15em' }}>
                L'immobilier accessible
              </span>
            </motion.div>

            {/* Hairline dorée */}
            <motion.div
              className="w-24 h-px mb-4 md:mb-7"
              initial={prefersReducedMotion ? false : { scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              style={{
                background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--primary)), hsl(var(--primary)), transparent)',
              }}
            />

            {/* Tab Selector */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-4 md:mb-6 w-full max-w-md"
            >
              <div className="flex rounded-xl border border-primary/30 bg-background backdrop-blur-md p-1 gap-1">
                <button
                  onClick={() => {
                    setSearchType('location');
                    const el = document.getElementById('calculateur');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 md:py-3 md:px-4 rounded-lg font-semibold transition-all duration-300 ${
                    isLocation || !searchType
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:text-muted-foreground hover:bg-primary/10'
                  }`}
                >
                  <Key className="h-5 w-5" />
                  <span>Je cherche à louer</span>
                </button>
                <button
                  onClick={() => {
                    setSearchType('achat');
                    const el = document.getElementById('calculateur');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 md:py-3 md:px-4 rounded-lg font-semibold transition-all duration-300 ${
                    isAchat
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:text-muted-foreground hover:bg-primary/10'
                  }`}
                >
                  <Home className="h-5 w-5" />
                  <span>Je cherche à acheter</span>
                </button>
              </div>
            </motion.div>

            {/* Parcours secondaires */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-6 md:mb-8 w-full max-w-2xl"
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Services propriétaires — Immo-rama.ch</p>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {parcours.map(({ href, icon: Icon, label }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1 md:gap-2 p-3 md:p-4 rounded-xl border border-primary/30 bg-background backdrop-blur-sm hover:border-primary/30 hover:bg-primary/10 transition-all duration-300 group"
                  >
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
                    <span className="text-[11px] md:text-sm font-semibold text-muted-foreground group-hover:text-foreground text-center leading-tight transition-colors">{label}</span>
                  </a>
                ))}
              </div>
            </motion.div>

            {/* LOCATION CONTENT */}
            {(isLocation || !searchType) && (
              <motion.div
                key="location"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                className="space-y-6 md:space-y-8 w-full"
              >
                <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-semibold">
                  Agence N°1 de relocation en Suisse romande • Chasseur premium
                </p>

                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight max-w-3xl mx-auto font-serif">
                  <WordReveal text="Ton futur appartement," delay={0.1} />
                  {' '}
                  <span className="luxury-gradient-text">Notre Mission&nbsp;!</span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Confie la recherche ou la relocation de ton appartement à{' '}
                  <strong className="text-muted-foreground">des experts de l'immobilier en Suisse romande !</strong>
                </p>

                <div className="flex flex-wrap items-center justify-center gap-x-1 text-sm sm:text-base font-medium text-muted-foreground">
                  <span>Recherche ciblée</span>
                  <span className="text-primary">·</span>
                  <span>Dossier optimisé</span>
                  <span className="text-primary">·</span>
                  <span>Visites déléguées</span>
                  <span className="text-primary">·</span>
                  <span>Accompagnement jusqu'au bail</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                  <span className="font-medium text-muted-foreground">+500 familles accompagnées</span>
                  <span className="hidden sm:inline text-primary">·</span>
                  <span>4.8★ Google</span>
                  <span className="hidden sm:inline text-primary">·</span>
                  <span>Réponse sous 24h</span>
                  <span className="hidden sm:inline text-primary">·</span>
                  <span>90 jours ou remboursé</span>
                </div>

                <div className="max-w-2xl mx-auto">
                  <MagneticButton>
                    <Button
                      asChild
                      size="lg"
                      className="w-full group luxury-shimmer-btn luxury-cta-glow bg-primary text-primary-foreground hover:bg-primary/90 border-0 font-semibold text-base md:text-lg py-7"
                    >
                      <a href="#analyse-dossier">
                        <FileSearch className="h-5 w-5 mr-2" />
                        Analyse gratuite de mon dossier
                        <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </Button>
                  </MagneticButton>
                  <p className="text-xs text-muted-foreground mt-3">
                    Gratuit · Sans engagement · Réponse sous 24h
                  </p>
                </div>

                <a
                  href="#comment-ca-marche"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary font-medium transition-colors"
                >
                  Voir comment ça marche
                  <ArrowRight className="h-4 w-4" />
                </a>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />Acompte 300 CHF
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />Commission uniquement en cas de succès
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />Remboursement si échec après 90 jours
                  </span>
                </div>
              </motion.div>
            )}

            {/* ACHAT CONTENT */}
            {isAchat && (
              <motion.div
                key="achat"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                className="space-y-4 w-full"
              >
                <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground font-serif">
                  <WordReveal text="Trouve ton bien idéal" delay={0.1} />
                  {' '}
                  <span className="luxury-gradient-text">
                    <WordReveal text="avant qu'il soit sur le marché" delay={0.3} />
                  </span>
                </h1>
                <p className="text-base md:text-2xl font-semibold text-muted-foreground">
                  Accès exclusif à{' '}
                  <span className="luxury-gradient-text">des biens off-market dans ta région</span>
                </p>
                <p className="text-sm md:text-lg text-primary font-medium">
                  🏡 Commission: 1% du prix d'achat (acompte déduit)
                </p>
                <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Nos experts cherchent, sélectionnent et contactent les vendeurs pour toi, afin de{' '}
                  <strong className="text-muted-foreground">maximiser tes chances de trouver plus vite et mieux</strong>.
                </p>

                <div className="mx-auto max-w-lg">
                  <div className="rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 border border-green-500/40 bg-green-500/10 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2 md:gap-3">
                      <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-green-400 flex-shrink-0" />
                      <span className="text-base md:text-2xl font-bold text-foreground">
                        6 mois de recherche • Remboursé si échec
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <MagneticButton>
                    <Button
                      asChild
                      size="lg"
                      className="group text-base md:text-2xl px-8 md:px-14 py-5 md:py-9 luxury-shimmer-btn luxury-cta-glow bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                    >
                      <Link to="/nouveau-mandat">
                        <Rocket className="mr-3 h-6 w-6 md:h-7 md:w-7" />
                        <span className="font-bold">Trouver mon bien idéal</span>
                        <ArrowRight className="ml-3 h-6 w-6 md:h-7 md:w-7 group-hover:translate-x-2 transition-transform" />
                      </Link>
                    </Button>
                  </MagneticButton>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span>Sans engagement • Aucune carte de crédit requise</span>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="group text-sm md:text-base px-6 md:px-8 py-4 md:py-5 border-2 border-green-500/30 hover:border-green-500 bg-transparent hover:bg-green-500/5 text-green-400 hover:text-green-300 transition-all duration-300"
                  >
                    <a href="#analyse-dossier">
                      <FileSearch className="mr-2 h-5 w-5" />
                      <span>Analyse gratuite de solvabilité</span>
                    </a>
                  </Button>
                  <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />Acompte 2'499 CHF
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />Mandat de 6 mois
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />Acompte déduit de la commission
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Login + Trust (common) */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-6"
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-muted-foreground hover:bg-primary/10">
                  <Link to="/login">Déjà client ? Se connecter</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-2 border-green-500/40 hover:border-green-500 bg-transparent hover:bg-green-500/10 text-green-400 hover:text-green-300"
                >
                  <Link to="/inscription-annonceur">Déposer une annonce</Link>
                </Button>
              </div>
            </motion.div>
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-6"
            >
              <div className="inline-flex items-center gap-2 bg-background backdrop-blur-sm rounded-full px-4 py-2 border border-primary/30">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  <span className="text-primary font-medium">
                    {isAchat ? '+150 biens vendus' : '+500 familles accompagnées'}
                  </span>{' '}
                  avec succès
                </span>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>
                  {isAchat
                    ? '🇨🇭 Service premium • Commission 1% • Remboursé après 6 mois sans succès'
                    : '🇨🇭 Service premium • Mandat de 90 jours • Transparence totale'}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
    </section>
  );
}
