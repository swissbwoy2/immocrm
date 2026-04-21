import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

interface GoldDividerProps {
  className?: string;
  width?: number;
}

export function GoldDivider({ className = '', width = 120 }: GoldDividerProps) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div ref={ref} className={`flex items-center justify-center ${className}`}>
      <svg width={width} height="12" viewBox={`0 0 ${width} 12`} fill="none">
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="30%" stopColor="hsl(38, 45%, 48%)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(38, 55%, 65%)" />
            <stop offset="70%" stopColor="hsl(38, 45%, 48%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <motion.path
          d={`M 0 6 Q ${width * 0.25} 2 ${width * 0.5} 6 Q ${width * 0.75} 10 ${width} 6`}
          stroke="url(#gold-grad)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView || prefersReducedMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
        />
        <motion.circle
          cx={width / 2}
          cy="6"
          r="2.5"
          fill="hsl(38, 55%, 65%)"
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView || prefersReducedMotion ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        />
      </svg>
    </div>
  );
}
