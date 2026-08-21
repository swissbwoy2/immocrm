import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PremiumPageShellV2Props {
  children: ReactNode;
  className?: string;
}

export function PremiumPageShellV2({ children, className = '' }: PremiumPageShellV2Props) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`min-h-full p-4 md:p-6 lg:p-8 space-y-6 relative ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/[0.035] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/[0.02] blur-3xl" />
      </div>
      <div className="relative z-10 space-y-6">{children}</div>
    </motion.div>
  );
}
