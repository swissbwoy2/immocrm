import { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * Lightweight wrapper that adds ambient glow + fade-in without changing padding/layout.
 * Use this on pages that already manage their own padding via an inner div.
 */
interface PremiumPageGlowProps {
  children: ReactNode;
  className?: string;
}

export function PremiumPageGlow({ children, className = '' }: PremiumPageGlowProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      {children}
    </motion.div>
  );
}
