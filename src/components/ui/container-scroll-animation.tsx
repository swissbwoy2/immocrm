import { useRef } from 'react';
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion';

interface ContainerScrollProps {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ContainerScroll({ titleComponent, children, className }: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const scaleDimensions = () => {
    if (typeof window === 'undefined') return [1.05, 1];
    return window.innerWidth <= 760 ? [1.05, 1] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [0, 0] : [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], scaleDimensions());
  const translateY = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [0, 0] : ['-10%', '0%']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.3], prefersReducedMotion ? [0, 0] : [0, -60]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-start overflow-hidden ${className ?? ''}`}
      style={{ height: '200vh' }}
    >
      <div className="sticky top-0 w-full h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Title fades out on scroll */}
        <motion.div
          style={{ opacity: titleOpacity, y: titleY }}
          className="text-center mb-10 px-4 z-10 relative"
        >
          {titleComponent}
        </motion.div>

        {/* 3D rotating container */}
        <motion.div
          style={{
            rotateX: rotate,
            scale,
            y: translateY,
            transformPerspective: 1000,
          }}
          className="w-full max-w-5xl mx-auto px-4"
        >
          <div
            className="rounded-2xl md:rounded-3xl overflow-hidden border border-[hsl(38_45%_48%/0.2)] shadow-[0_0_60px_hsl(38_45%_48%/0.1)]"
            style={{
              background: 'linear-gradient(135deg, hsl(30 15% 11%) 0%, hsl(30 15% 13%) 100%)',
            }}
          >
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
