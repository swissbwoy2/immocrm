import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useIOSOptimizations } from '@/hooks/useIOSOptimizations';

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({ 
  count = 15,
  className 
}) => {
  const { particleCount, shouldReduceMotion, isIOS } = useIOSOptimizations();
  
  // Use optimized count based on device
  const optimizedCount = Math.min(count, particleCount);
  
  // Generate particles only once
  const particles = useMemo(() => {
    if (shouldReduceMotion) return [];
    
    return Array.from({ length: optimizedCount }).map((_, i) => ({
      key: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 4 + 2}px`,
      opacity: Math.random() * 0.3 + 0.1,
      delay: `${Math.random() * 3}s`,
      duration: `${Math.random() * 8 + 12}s`,
    }));
  }, [optimizedCount, shouldReduceMotion]);

  // Don't render on iOS or reduced motion
  if (shouldReduceMotion || particles.length === 0) {
    return null;
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {particles.map((particle) => (
        <div
          key={particle.key}
          className={cn(
            "absolute rounded-full",
            isIOS ? "" : "animate-float"
          )}
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            background: `hsl(var(--primary) / ${particle.opacity})`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
};

export const MeshGradientBackground: React.FC<{ className?: string }> = ({ className }) => {
  const { shouldReduceMotion, shouldDisableBlur } = useIOSOptimizations();
  
  // Simplified static gradient for iOS/low-end devices
  if (shouldReduceMotion) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div 
        className={cn(
          "absolute w-96 h-96 rounded-full opacity-20 animate-float",
          shouldDisableBlur ? "" : "blur-3xl"
        )}
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
          top: '-10%',
          right: '-10%',
          animationDuration: '20s',
        }}
      />
      <div 
        className={cn(
          "absolute w-80 h-80 rounded-full opacity-15 animate-float",
          shouldDisableBlur ? "" : "blur-3xl"
        )}
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
          bottom: '10%',
          left: '-5%',
          animationDelay: '5s',
          animationDuration: '25s',
        }}
      />
    </div>
  );
};

export const ChatPatternBackground: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("absolute inset-0 overflow-hidden pointer-events-none opacity-5", className)}>
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="chat-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="2" fill="currentColor" className="text-foreground" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#chat-pattern)" />
    </svg>
  </div>
);
