import { ReactNode } from 'react';

interface LandingFormCardProps {
  children: ReactNode;
  className?: string;
}

export function LandingFormCard({ children, className = '' }: LandingFormCardProps) {
  return (
    <div
      className={`relative rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-lg shadow-black/5 p-6 md:p-10 ${className}`}
    >
      {children}
    </div>
  );
}
