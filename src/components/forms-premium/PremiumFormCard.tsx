import { ReactNode } from 'react';
import { BorderBeam } from '@/components/public-site/magic/BorderBeam';

interface PremiumFormCardProps {
  children: ReactNode;
  className?: string;
  withBeam?: boolean;
}

export function PremiumFormCard({ children, className = '', withBeam = true }: PremiumFormCardProps) {
  return (
    <div className={`relative rounded-2xl overflow-hidden bg-[hsl(30_15%_11%/0.8)] backdrop-blur-xl border border-[hsl(38_45%_48%/0.2)] p-8 md:p-12 ${className}`}>
      {withBeam && <BorderBeam duration={8} colorFrom="hsl(38 55% 65%)" colorTo="hsl(28 35% 38%)" />}
      {children}
    </div>
  );
}
