import { motion, AnimatePresence, Transition } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode, useMemo } from "react";
import { useIOSOptimizations } from "@/hooks/useIOSOptimizations";

interface PageTransitionProps {
  children: ReactNode;
}

// Lighter variants for better performance
const pageVariants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
  },
  out: {
    opacity: 0,
  },
};

// iOS-optimized: no transform, minimal duration
const iosTransition: Transition = {
  type: "tween",
  ease: "linear",
  duration: 0.1,
};

// Standard transition
const standardTransition: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.15,
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const { isIOS, shouldReduceMotion } = useIOSOptimizations();

  const transition = useMemo(() => {
    return isIOS || shouldReduceMotion ? iosTransition : standardTransition;
  }, [isIOS, shouldReduceMotion]);

  // For iOS/reduced motion: skip animation entirely
  if (shouldReduceMotion) {
    return <div className="h-full w-full">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={transition}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
