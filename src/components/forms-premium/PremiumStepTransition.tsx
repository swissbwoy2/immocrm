import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface PremiumStepTransitionProps {
  children: ReactNode;
  stepKey: number | string;
  direction?: 1 | -1;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
    scale: 0.97,
  }),
};

export function PremiumStepTransition({ children, stepKey, direction = 1 }: PremiumStepTransitionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
