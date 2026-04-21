import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: 'spring' as const, stiffness: 350, damping: 40 },
  };
  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export function AnimatedList({ className, children, delay = 1000 }: AnimatedListProps) {
  const [index, setIndex] = useState(0);
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (index < childrenArray.length - 1) {
      const timeout = setTimeout(() => setIndex((prev) => prev + 1), delay);
      return () => clearTimeout(timeout);
    }
  }, [index, delay, childrenArray.length]);

  const itemsToShow = useMemo(() => childrenArray.slice(0, index + 1).reverse(), [index, childrenArray]);

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <AnimatePresence>
        {itemsToShow.map((item) => (
          <AnimatedListItem key={(item as React.ReactElement).key}>{item}</AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
}
