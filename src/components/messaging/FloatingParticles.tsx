import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({ 
  count = 15,
  className 
}) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            background: `hsl(var(--primary) / ${Math.random() * 0.5 + 0.2})`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 10 + 10}s`,
          }}
        />
      ))}
    </div>
  );
};

export const MeshGradientBackground: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
    {/* Gradient orbs */}
    <div 
      className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl animate-float"
      style={{
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
        top: '-10%',
        right: '-10%',
        animationDuration: '20s',
      }}
    />
    <div 
      className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl animate-float"
      style={{
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
        bottom: '10%',
        left: '-5%',
        animationDelay: '5s',
        animationDuration: '25s',
      }}
    />
    <div 
      className="absolute w-64 h-64 rounded-full opacity-10 blur-3xl animate-float"
      style={{
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
        top: '40%',
        right: '20%',
        animationDelay: '10s',
        animationDuration: '30s',
      }}
    />
  </div>
);

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
