import { useScroll, useSpring, motion, useReducedMotion } from 'framer-motion';

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const prefersReducedMotion = useReducedMotion();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      className="luxury-progress-bar"
      style={{ scaleX, transformOrigin: 'left' }}
    />
  );
}
