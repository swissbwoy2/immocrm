import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  prefix = '', 
  suffix = '', 
  decimals = 2,
  className = ''
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    startRef.current = displayValue;
    const startTime = performance.now();
    const startValue = startRef.current;
    const diff = value - startValue;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + diff * easeOutQuart;
      
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}
