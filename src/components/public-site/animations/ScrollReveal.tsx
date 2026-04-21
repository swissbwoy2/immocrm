import { useRef, ReactNode } from 'react';
import { motion, useInView, useReducedMotion, Variants } from 'framer-motion';
import { revealVariants, RevealVariant } from '@/hooks/useScrollReveal';

interface ScrollRevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
}

export function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 0.6,
  className,
  once = true,
  threshold = 0.15,
  as = 'div',
}: ScrollRevealProps) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(ref, { once, amount: threshold });

  if (prefersReducedMotion) {
    const Tag = as as any;
    return <Tag className={className}>{children}</Tag>;
  }

  const variants = revealVariants[variant] as Variants;
  const MotionTag = motion[as as keyof typeof motion] as any;

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
    >
      {children}
    </MotionTag>
  );
}
