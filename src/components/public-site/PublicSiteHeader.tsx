import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, Menu, LogIn, Calendar } from 'lucide-react';
import logo from '@/assets/logo-immo-rama-new.png';
import { PublicSiteMenu } from './PublicSiteMenu';
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';

export function PublicSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 40);
  });

  return (
    <>
      <motion.header
        className="fixed left-0 right-0 z-50"
        style={{ top: 'calc(var(--banner-h, 34px) + env(safe-area-inset-top, 0px))' }}
        initial={prefersReducedMotion ? false : { y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <div
          className="transition-all duration-500"
          style={{
            backgroundColor: scrolled ? 'hsl(0 0% 100% / 0.97)' : 'hsl(0 0% 100% / 0.85)',
            backdropFilter: scrolled ? 'blur(24px)' : 'blur(10px)',
            WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'blur(10px)',
            borderBottom: `1px solid hsl(142 45% 50% / ${scrolled ? '0.35' : '0.15'})`,
            boxShadow: scrolled ? '0 4px 24px hsl(142 30% 20% / 0.08)' : 'none',
          }}
        >
          <div className="container mx-auto px-4 py-2.5 flex items-center" style={{ minHeight: 'var(--header-h, 60px)' }}>
            <div className="flex items-center justify-between w-full">
              {/* Left: hamburger + logo */}
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setMenuOpen(true)}
                  className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  aria-label="Menu"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </motion.button>
                <Link to="/" className="flex items-center" aria-label="Accueil Immo-Rama">
                  <motion.img
                    src={logo}
                    alt="Immo-Rama"
                    className="w-auto"
                    animate={prefersReducedMotion ? {} : { height: scrolled ? '28px' : '32px' }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '32px' }}
                  />
                </Link>
              </div>

              {/* Right: CTAs */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-primary/30 hover:border-primary/30 hover:bg-primary/10 transition-all duration-300"
                >
                  <Link to="/login">
                    <LogIn className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Mon espace client</span>
                  </Link>
                </Button>

                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  className="hidden sm:block"
                >
                  <Button
                    asChild
                    size="sm"
                    className="luxury-shimmer-btn luxury-cta-glow bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                  >
                    <Link to="/rendez-vous">
                      <Calendar className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Réserver mon RDV au bureau gratuitement</span>
                    </Link>
                  </Button>
                </motion.div>

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden lg:inline-flex text-muted-foreground hover:text-foreground"
                >
                  <Link to="/nouveau-mandat">
                    <Rocket className="h-4 w-4 mr-1.5" />
                    Activer ma recherche
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <PublicSiteMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
