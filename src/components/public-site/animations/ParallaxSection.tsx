import { useRef, ReactNode } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  scale?: boolean;
}

export function ParallaxSection({ children, className = '', speed = 0.3, scale = false }: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const effectiveSpeed = isMobile ? speed * 0.4 : speed;

  const y = useTransform(scrollYProgress, [0, 1], [`${effectiveSpeed * -50}%`, `${effectiveSpeed * 50}%`]);
  const scaleVal = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1, 1.05]);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        style={{ y, ...(scale ? { scale: scaleVal } : {}) }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
