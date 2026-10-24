import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/*
 * Briques communes de la page d’accueil, alignées sur le tunnel /courtier (référence Airbnb) :
 * fond blanc, encre de la marque, un seul accent vert foncé (contraste AA avec le texte blanc),
 * surfaces grises #f7f7f7, coins de 14 px, boutons de 48 px.
 */
export const ACCENT_BG = 'bg-[var(--home-accent)] hover:bg-[var(--home-accent-hover)] active:bg-[var(--home-accent-active)]';
export const ACCENT_TEXT = 'text-[var(--home-accent)]';
export const SURFACE = 'bg-[var(--home-surface)]';
export const CONTAINER = 'mx-auto w-full max-w-[1120px] px-4 md:px-6';
export const H2 = 'text-[26px] md:text-[32px] leading-[1.15] tracking-[-0.02em] text-foreground';
export const H3 = 'text-[18px] md:text-[20px] leading-snug text-foreground';
export const BODY = 'text-[16px] leading-[1.55] text-foreground/90';
export const MUTED = 'text-[15px] leading-[1.5] text-muted-foreground';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2';

type CtaProps = {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  external?: boolean;
};

/** Bouton-lien de 48 px : route interne, ancre (#...) ou lien externe. */
export function Cta({ to, children, variant = 'primary', className, external }: CtaProps) {
  const cls = cn(
    'inline-flex h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-6 text-[16px] font-medium transition-colors duration-150',
    variant === 'primary'
      ? cn(ACCENT_BG, 'text-white')
      : 'bg-white text-foreground ring-1 ring-inset ring-foreground/80 hover:bg-[var(--home-surface)]',
    FOCUS,
    className,
  );
  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  if (to.startsWith('#')) {
    return (
      <a href={to} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

/** Apparition douce à l’entrée dans l’écran ; contenu visible tel quel si le mouvement est réduit. */
export function Reveal({ children, delay = 0, className, as = 'div' }: {
  children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li';
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return as === 'li' ? <li className={className}>{children}</li> : <div className={className}>{children}</div>;
  }
  const M = as === 'li' ? motion.li : motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/** Question fréquente repliable (même dessin que le tunnel /courtier). */
export function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('rounded-[14px] px-4', SURFACE)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn('flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 py-4 text-left', FOCUS)}
      >
        <span className="text-[16px] font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={cn('h-5 w-5 flex-none text-foreground transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {open && <p className="-mt-1 pb-4 text-[16px] leading-relaxed text-foreground/85">{a}</p>}
    </div>
  );
}
