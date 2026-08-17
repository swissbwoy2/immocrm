import { Crown, Key, Home, Building2, Hammer, KeyRound } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroChasseurAsset from '@/assets/hero-chasseur-split.png.asset.json';
import heroChasseurMobileAsset from '@/assets/hero-chasseur-mobile-916.png.asset.json';
const heroBg = heroChasseurAsset.url;
const heroBgMobile = heroChasseurMobileAsset.url;
import { useSearchType } from '@/contexts/SearchTypeContext';
import { motion, useReducedMotion } from 'framer-motion';
import { GrainOverlay } from '@/components/public-site/animations/GrainOverlay';
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

          </div>
        </div>
    </section>
  );
}
