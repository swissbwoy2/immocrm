import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SectionVariant = 'pending' | 'confirmed' | 'refused' | 'completed';

interface PremiumVisiteDelegueeSectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  count: number;
  variant: SectionVariant;
  children: ReactNode;
  className?: string;
  delay?: number;
}

const variantStyles: Record<SectionVariant, {
  bg: string;
  border: string;
  blur: string;
  iconColor: string;
  titleColor: string;
  descColor: string;
  badgeBg: string;
  badgeText: string;
  particle: string;
}> = {
  pending: {
    bg: 'from-amber-50/80 via-amber-50/40 to-orange-50/30 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-orange-950/10',
    border: 'border-amber-200/60 dark:border-amber-800/40 hover:border-amber-300/80 dark:hover:border-amber-700/60',
    blur: 'bg-amber-300/30 dark:bg-amber-600/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-900 dark:text-amber-100',
    descColor: 'text-amber-700/80 dark:text-amber-300/80',
    badgeBg: 'bg-amber-200/70 dark:bg-amber-800/50',
    badgeText: 'text-amber-800 dark:text-amber-200',
    particle: 'bg-amber-400/40'
  },
  confirmed: {
    bg: 'from-blue-50/80 via-blue-50/40 to-indigo-50/30 dark:from-blue-950/40 dark:via-blue-900/20 dark:to-indigo-950/10',
    border: 'border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300/80 dark:hover:border-blue-700/60',
    blur: 'bg-blue-300/30 dark:bg-blue-600/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-900 dark:text-blue-100',
    descColor: 'text-blue-700/80 dark:text-blue-300/80',
    badgeBg: 'bg-blue-200/70 dark:bg-blue-800/50',
    badgeText: 'text-blue-800 dark:text-blue-200',
    particle: 'bg-blue-400/40'
  },
  refused: {
    bg: 'from-slate-50/80 via-slate-50/40 to-gray-50/30 dark:from-slate-950/40 dark:via-slate-900/20 dark:to-gray-950/10',
    border: 'border-slate-200/60 dark:border-slate-800/40 hover:border-slate-300/80 dark:hover:border-slate-700/60',
    blur: 'bg-slate-300/20 dark:bg-slate-600/15',
    iconColor: 'text-slate-500 dark:text-slate-400',
    titleColor: 'text-slate-700 dark:text-slate-200',
    descColor: 'text-slate-600/80 dark:text-slate-400/80',
    badgeBg: 'bg-slate-200/70 dark:bg-slate-800/50',
    badgeText: 'text-slate-700 dark:text-slate-300',
    particle: 'bg-slate-400/30'
  },
  completed: {
    bg: 'from-emerald-50/80 via-green-50/40 to-teal-50/30 dark:from-emerald-950/40 dark:via-green-900/20 dark:to-teal-950/10',
    border: 'border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300/80 dark:hover:border-emerald-700/60',
    blur: 'bg-emerald-300/30 dark:bg-emerald-600/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    titleColor: 'text-emerald-900 dark:text-emerald-100',
    descColor: 'text-emerald-700/80 dark:text-emerald-300/80',
    badgeBg: 'bg-emerald-200/70 dark:bg-emerald-800/50',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    particle: 'bg-emerald-400/40'
  }
};

export function PremiumVisiteDelegueSection({
  title,
  description,
  icon: Icon,
  count,
  variant,
  children,
  className,
  delay = 0
}: PremiumVisiteDelegueeSectionProps) {
  const styles = variantStyles[variant];

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br backdrop-blur-sm',
        styles.bg,
        'border transition-all duration-500',
        styles.border,
        'p-5 md:p-6',
        'animate-fade-in group/section',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Blur orb */}
      <div className={cn(
        'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-60',
        styles.blur
      )} />
      <div className={cn(
        'absolute bottom-0 left-1/4 w-24 h-24 rounded-full blur-2xl opacity-40',
        styles.blur
      )} />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute w-2 h-2 rounded-full animate-float opacity-60',
              styles.particle
            )}
            style={{
              left: `${20 + i * 20}%`,
              top: `${30 + (i % 2) * 40}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover/section:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover/section:translate-x-[200%] transition-transform duration-1000" />
      </div>

      {/* Header */}
      <div className="relative mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2.5 rounded-xl',
            'bg-gradient-to-br from-white/60 to-white/20',
            'dark:from-white/10 dark:to-white/5',
            'shadow-sm border border-white/40 dark:border-white/10',
            'group-hover/section:scale-110 transition-transform duration-300'
          )}>
            <Icon className={cn('w-5 h-5', styles.iconColor)} />
          </div>
          <div className="flex-1">
            <h2 className={cn(
              'text-lg font-semibold flex items-center gap-2 flex-wrap',
              styles.titleColor
            )}>
              {title}
              <Badge className={cn(
                'font-medium',
                styles.badgeBg,
                styles.badgeText
              )}>
                {count}
              </Badge>
            </h2>
            {description && (
              <p className={cn('text-sm mt-0.5', styles.descColor)}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative grid gap-4">
        {children}
      </div>
    </div>
  );
}
