import React from 'react';
import { Home, Ruler, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { AddressLink } from '@/components/AddressLink';

interface PremiumOffreCardProps {
  offre: any;
  className?: string;
}

export const PremiumOffreCard: React.FC<PremiumOffreCardProps> = ({ offre, className }) => {
  return (
    <div 
      className={cn(
        'relative mt-3 p-5 rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/40',
        'dark:from-blue-950/60 dark:via-indigo-950/40 dark:to-purple-950/30',
        'border-2 border-blue-200/50 dark:border-blue-800/50',
        'shadow-lg shadow-blue-500/10',
        'transition-all duration-500',
        'hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1',
        'group',
        className
      )}
    >
      {/* Animated gradient border */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div 
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.2))',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }}
        />
      </div>

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 rounded-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            'p-2.5 rounded-xl',
            'bg-gradient-to-br from-blue-500 to-indigo-600',
            'shadow-lg shadow-blue-500/30',
            'transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3'
          )}>
            <Home className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <AddressLink 
              address={offre.adresse}
              className="font-bold text-foreground truncate block"
              showIcon={false}
            />
            <div className="text-muted-foreground text-xs mt-0.5">
              <span>{offre.type_bien || 'Appartement'}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={cn(
            'p-3 rounded-xl text-center',
            'bg-white/60 dark:bg-white/5',
            'border border-white/50 dark:border-white/10',
            'transition-all duration-300 hover:scale-105 hover:shadow-md'
          )}>
            <p className="text-lg font-bold text-primary">
              {offre.prix?.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CHF/mois</p>
          </div>
          
          {offre.surface && (
            <div className={cn(
              'p-3 rounded-xl text-center',
              'bg-white/60 dark:bg-white/5',
              'border border-white/50 dark:border-white/10',
              'transition-all duration-300 hover:scale-105 hover:shadow-md'
            )}>
              <div className="flex items-center justify-center gap-1">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{offre.surface}</p>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">m²</p>
            </div>
          )}
          
          {offre.pieces && (
            <div className={cn(
              'p-3 rounded-xl text-center',
              'bg-white/60 dark:bg-white/5',
              'border border-white/50 dark:border-white/10',
              'transition-all duration-300 hover:scale-105 hover:shadow-md'
            )}>
              <div className="flex items-center justify-center gap-1">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{offre.pieces}</p>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pièces</p>
            </div>
          )}
        </div>

        {/* Link preview */}
        {offre.lien_annonce && (
          <div className="mt-3">
            <LinkPreviewCard url={offre.lien_annonce} />
          </div>
        )}
      </div>
    </div>
  );
};
