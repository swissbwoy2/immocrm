import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Key, Home, Rocket, ShieldCheck, ArrowRight, CheckCircle, Lock, Users, FileSearch, Building2, Hammer, KeyRound } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroBg from '@/assets/hero-bg.jpg';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { GrainOverlay } from '@/components/public-site/animations/GrainOverlay';
import { WordReveal } from '@/components/public-site/animations/WordReveal';
import { MagneticButton } from '@/components/public-site/animations/MagneticButton';
import { Meteors } from '@/components/public-site/magic/Meteors';
import { Scene3DWrapper } from '@/components/public-site/3d/Scene3DWrapper';
import { LuxuryParticles3D } from '@/components/public-site/3d/LuxuryParticles3D';
import { AnimatedShaderHero } from '@/components/ui/animated-shader-hero';

const zoneOptions = [
  { value: 'Genève', label: 'Genève' },
  { value: 'Lausanne', label: 'Lausanne' },
  { value: 'Nyon', label: 'Nyon' },
  { value: 'Morges', label: 'Morges' },
  { value: 'Vevey-Montreux', label: 'Vevey / Montreux' },
  { value: 'Fribourg', label: 'Fribourg' },
  { value: 'Neuchâtel', label: 'Neuchâtel' },
  { value: 'Autre', label: 'Autre région' },
];

const budgetOptions = [
  { value: '< 1500', label: "Moins de 1'500 CHF" },
  { value: '1500-2000', label: "1'500 - 2'000 CHF" },
  { value: '2000-2500', label: "2'000 - 2'500 CHF" },
  { value: '2500-3000', label: "2'500 - 3'000 CHF" },
  { value: '3000-4000', label: "3'000 - 4'000 CHF" },
  { value: '> 4000', label: "Plus de 4'000 CHF" },
];

const permisOptions = [
  { value: 'Suisse', label: 'Nationalité Suisse' },
  { value: 'C', label: 'Permis C' },
  { value: 'B', label: 'Permis B' },
  { value: 'G', label: 'Permis G' },
  { value: 'Autre', label: 'Autre' },
];

const parcours = [
  { to: '/relouer-mon-appartement', icon: KeyRound, label: "Relouer mon appart'" },
  { to: '/vendre-mon-bien', icon: Building2, label: 'Vendre mon bien' },
  { to: '/construire-renover', icon: Hammer, label: 'Construire & rénover' },
];

export function HeroSection() {
  const navigate = useNavigate();
  const { searchType, setSearchType, isLocation, isAchat } = useSearchType();
  const [zone, setZone] = useState('');
  const [budget, setBudget] = useState('');
  const [permis, setPermis] = useState('');
  const prefersReducedMotion = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const bgY = useTransform(scrollYProgress, [0, 1], isMobile ? ['0%', '15%'] : ['0%', '30%']);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', isMobile ? '8%' : '18%']);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.8], [0.82, 0.95]);

  const handleSubmit = () => {
    const params = new URLSearchParams();
    if (zone) params.set('zone', zone);
    if (budget) params.set('budget', budget);
    if (permis) params.set('permis', permis);
    const qs = params.toString();
    navigate(`/nouveau-mandat${qs ? '?' + qs : ''}`);
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden luxury-grain"
    >
      {/* Parallax background — visible as WebGL fallback */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { y: bgY, scale: bgScale }}
      >
        <img src={heroBg} alt="" className="w-full h-full object-cover" loading="eager" />
      </motion.div>

      {/* WebGL Shader background — z-[1], sits above image */}
      <AnimatedShaderHero className="absolute inset-0 z-[1] opacity-80" />

      {/* Gradient overlay — luxury dark */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? { opacity: 0.88 } : { opacity: overlayOpacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_8%/0.92)] via-[hsl(28_25%_12%/0.86)] to-[hsl(30_15%_8%/0.96)]" />
        {/* Subtle gold radial at center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,hsl(38_45%_48%/0.08)_0%,transparent_70%)]" />
      </motion.div>

      {/* Grain overlay */}
      <GrainOverlay opacity={0.03} />

      {/* Gold meteors */}
      <Meteors number={18} className="z-[1]" />

      {/* 3D particles (desktop only) */}
      <Scene3DWrapper
        className="absolute inset-0 z-[1] pointer-events-none opacity-40"
        cameraPosition={[0, 0, 12]}
        fogNear={15}
        fogFar={40}
      >
        <LuxuryParticles3D count={1200} spread={22} />
      </Scene3DWrapper>

      {/* Content */}
      <motion.div
        className="container mx-auto px-4 py-8 md:py-20 relative z-10"
        style={prefersReducedMotion ? {} : { y: contentY }}
      >
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

          {/* Badge N°1 */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-3 md:mb-5"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[hsl(38_45%_48%/0.15)] to-[hsl(28_35%_35%/0.1)] border border-[hsl(38_45%_48%/0.5)] rounded-full px-4 py-2 backdrop-blur-sm">
              <Crown className="h-4 w-4 text-[hsl(38_55%_65%)]" />
              <span className="text-xs md:text-sm font-semibold text-[hsl(38_55%_75%)] tracking-wide">
                ⭐ Agence N°1 de relocation en Suisse romande • Chasseur premium
              </span>
            </div>
          </motion.div>

          {/* Logo */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-3 md:mb-5"
          >
            <img
              src={logoImmoRama}
              alt="Immo-Rama"
              className="h-16 md:h-32 w-auto drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 0 24px hsl(38 45% 48% / 0.3))' }}
            />
          </motion.div>

          {/* Slogan */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-4 md:mb-7"
          >
            <span className="text-base md:text-xl font-semibold tracking-widest uppercase text-[hsl(38_55%_65%)]"
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
              background: 'linear-gradient(90deg, transparent, hsl(38 45% 48% / 0.9), hsl(38 55% 65%), hsl(38 45% 48% / 0.9), transparent)',
            }}
          />

          {/* Tab Selector */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-4 md:mb-6 w-full max-w-md"
          >
            <div className="flex rounded-xl border border-[hsl(38_45%_48%/0.4)] bg-[hsl(30_15%_8%/0.6)] backdrop-blur-md p-1 gap-1">
              <button
                onClick={() => setSearchType('location')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 md:py-3 md:px-4 rounded-lg font-semibold transition-all duration-300 ${
                  isLocation || !searchType
                    ? 'bg-gradient-to-r from-[hsl(38_45%_44%)] to-[hsl(38_55%_52%)] text-[hsl(40_35%_98%)] shadow-lg shadow-[hsl(38_45%_48%/0.3)]'
                    : 'text-[hsl(40_25%_65%)] hover:text-[hsl(40_25%_85%)] hover:bg-[hsl(38_45%_48%/0.1)]'
                }`}
              >
                <Key className="h-5 w-5" />
                <span>Je cherche à louer</span>
              </button>
              <button
                onClick={() => setSearchType('achat')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 md:py-3 md:px-4 rounded-lg font-semibold transition-all duration-300 ${
                  isAchat
                    ? 'bg-gradient-to-r from-[hsl(38_45%_44%)] to-[hsl(38_55%_52%)] text-[hsl(40_35%_98%)] shadow-lg shadow-[hsl(38_45%_48%/0.3)]'
                    : 'text-[hsl(40_25%_65%)] hover:text-[hsl(40_25%_85%)] hover:bg-[hsl(38_45%_48%/0.1)]'
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
            <p className="text-xs uppercase tracking-widest text-[hsl(40_25%_55%)] mb-3">Autres parcours</p>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {parcours.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center justify-center gap-1 md:gap-2 p-3 md:p-4 rounded-xl border border-[hsl(38_45%_48%/0.2)] bg-[hsl(30_15%_8%/0.5)] backdrop-blur-sm hover:border-[hsl(38_45%_48%/0.6)] hover:bg-[hsl(38_45%_48%/0.08)] transition-all duration-300 group"
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-[hsl(38_45%_48%)] group-hover:text-[hsl(38_55%_65%)] group-hover:scale-110 transition-all duration-300" />
                  <span className="text-[11px] md:text-sm font-semibold text-[hsl(40_25%_80%)] group-hover:text-[hsl(40_25%_95%)] text-center leading-tight transition-colors">{label}</span>
                </Link>
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
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6 md:space-y-8 w-full"
            >
              <p className="text-xs sm:text-sm tracking-widest uppercase text-[hsl(38_45%_55%)] font-semibold">
                Agence N°1 de relocation en Suisse romande • Chasseur premium
              </p>

              {/* H1 avec word reveal */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(40_25%_92%)] leading-tight max-w-3xl mx-auto font-serif">
                <WordReveal text="Ton futur appartement," delay={0.1} />
                {' '}
                <span className="luxury-gradient-text">
                  <WordReveal text="Notre Mission !" delay={0.4} />
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-[hsl(40_20%_65%)] max-w-2xl mx-auto leading-relaxed">
                Confie la recherche ou la relocation de ton appartement à{' '}
                <strong className="text-[hsl(40_25%_85%)]">des experts de l'immobilier en Suisse romande !</strong>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-x-1 text-sm sm:text-base font-medium text-[hsl(40_25%_75%)]">
                <span>Recherche ciblée</span>
                <span className="text-[hsl(38_45%_48%)]">·</span>
                <span>Dossier optimisé</span>
                <span className="text-[hsl(38_45%_48%)]">·</span>
                <span>Visites déléguées</span>
                <span className="text-[hsl(38_45%_48%)]">·</span>
                <span>Accompagnement jusqu'au bail</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-[hsl(40_20%_60%)]">
                <span className="font-medium text-[hsl(40_25%_82%)]">+500 familles accompagnées</span>
                <span className="hidden sm:inline text-[hsl(38_45%_48%/0.5)]">·</span>
                <span>4.8★ Google</span>
                <span className="hidden sm:inline text-[hsl(38_45%_48%/0.5)]">·</span>
                <span>Réponse sous 24h</span>
                <span className="hidden sm:inline text-[hsl(38_45%_48%/0.5)]">·</span>
                <span>90 jours ou remboursé</span>
              </div>

              {/* CTA principal */}
              <div className="max-w-2xl mx-auto">
                <MagneticButton>
                  <Button
                    asChild
                    size="lg"
                    className="w-full group luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] via-[hsl(38_55%_52%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0 font-semibold text-base md:text-lg py-7"
                  >
                    <a href="#analyse-dossier">
                      <FileSearch className="h-5 w-5 mr-2" />
                      Analyse gratuite de mon dossier
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                </MagneticButton>
                <p className="text-xs text-[hsl(40_20%_55%)] mt-3">
                  Gratuit · Sans engagement · Réponse sous 24h
                </p>
              </div>

              <a
                href="#comment-ca-marche"
                className="inline-flex items-center gap-2 text-sm text-[hsl(38_45%_55%)] hover:text-[hsl(38_55%_70%)] font-medium transition-colors"
              >
                Voir comment ça marche
                <ArrowRight className="h-4 w-4" />
              </a>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[hsl(40_20%_55%)]">
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
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4 w-full"
            >
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-[hsl(40_25%_92%)] font-serif">
                <WordReveal text="Trouve ton bien idéal" delay={0.1} />
                {' '}
                <span className="luxury-gradient-text">
                  <WordReveal text="avant qu'il soit sur le marché" delay={0.3} />
                </span>
              </h1>
              <p className="text-base md:text-2xl font-semibold text-[hsl(40_25%_82%)]">
                Accès exclusif à{' '}
                <span className="luxury-gradient-text">des biens off-market dans ta région</span>
              </p>
              <p className="text-sm md:text-lg text-[hsl(38_45%_55%)] font-medium">
                🏡 Commission: 1% du prix d'achat (acompte déduit)
              </p>
              <p className="text-sm md:text-lg text-[hsl(40_20%_65%)] max-w-2xl mx-auto leading-relaxed">
                Nos experts cherchent, sélectionnent et contactent les vendeurs pour toi, afin de{' '}
                <strong className="text-[hsl(40_25%_82%)]">maximiser tes chances de trouver plus vite et mieux</strong>.
              </p>

              <div className="mx-auto max-w-lg">
                <div className="rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 border border-green-500/40 bg-green-500/10 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-2 md:gap-3">
                    <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-green-400 flex-shrink-0" />
                    <span className="text-base md:text-2xl font-bold text-[hsl(40_25%_92%)]">
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
                    className="group text-base md:text-2xl px-8 md:px-14 py-5 md:py-9 luxury-shimmer-btn luxury-cta-glow bg-gradient-to-r from-[hsl(38_45%_44%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] border-0"
                  >
                    <Link to="/nouveau-mandat">
                      <Rocket className="mr-3 h-6 w-6 md:h-7 md:w-7" />
                      <span className="font-bold">Trouver mon bien idéal</span>
                      <ArrowRight className="ml-3 h-6 w-6 md:h-7 md:w-7 group-hover:translate-x-2 transition-transform" />
                    </Link>
                  </Button>
                </MagneticButton>
                <div className="flex items-center gap-2 text-sm text-[hsl(40_20%_60%)]">
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
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-[hsl(40_20%_60%)] mt-2">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />Acompte 2'500 CHF
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
            <Button asChild variant="ghost" size="sm" className="text-[hsl(40_20%_55%)] hover:text-[hsl(40_25%_80%)] hover:bg-[hsl(38_45%_48%/0.08)]">
              <Link to="/login">Déjà client ? Se connecter</Link>
            </Button>
          </motion.div>
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-6"
          >
            <div className="inline-flex items-center gap-2 bg-[hsl(30_15%_8%/0.6)] backdrop-blur-sm rounded-full px-4 py-2 border border-[hsl(38_45%_48%/0.3)]">
              <Users className="h-4 w-4 text-[hsl(38_45%_55%)]" />
              <span className="text-sm text-[hsl(40_20%_65%)]">
                <span className="text-[hsl(38_55%_65%)] font-medium">
                  {isAchat ? '+150 biens vendus' : '+500 familles accompagnées'}
                </span>{' '}
                avec succès
              </span>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-[hsl(40_20%_55%)]">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span>
                {isAchat
                  ? '🇨🇭 Service premium • Commission 1% • Remboursé après 6 mois sans succès'
                  : '🇨🇭 Service premium • Mandat de 90 jours • Transparence totale'}
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={prefersReducedMotion ? {} : { y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        initial={prefersReducedMotion ? false : { opacity: 0 }}
      >
        <motion.div
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="w-7 h-12 border-2 border-[hsl(38_45%_48%/0.5)] rounded-full flex justify-center pt-2"
        >
          <div className="w-1.5 h-3 bg-gradient-to-b from-[hsl(38_55%_65%)] to-[hsl(38_45%_48%/0.3)] rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
