import { LucideIcon, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuickTileXLProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'destructive' | 'success';
  onClick: () => void;
  variant?: 'square' | 'wide';
  index?: number;
  rightSlot?: React.ReactNode;
}

export function QuickTileXL({
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  onClick,
  variant = 'square',
  index = 0,
  rightSlot,
}: QuickTileXLProps) {
  const badgeColor =
    badgeVariant === 'destructive'
      ? 'bg-destructive text-destructive-foreground'
      : badgeVariant === 'success'
      ? 'bg-emerald-500 text-white'
      : 'bg-primary text-primary-foreground';

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative group text-left w-full overflow-hidden rounded-2xl',
        'bg-card/80 backdrop-blur-sm border border-border/60',
        'hover:border-primary/40 hover:shadow-[0_8px_30px_hsl(217_91%_60%/0.12)]',
        'transition-all duration-300 cursor-pointer',
        variant === 'square' ? 'p-5 min-h-[140px] flex flex-col justify-between' : 'p-4 flex items-center gap-4'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {variant === 'square' ? (
        <>
          <div className="flex items-start justify-between relative z-10">
            <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            {badge !== undefined && badge !== 0 && (
              <span className={cn('text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center', badgeColor)}>
                {badge}
              </span>
            )}
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-base text-foreground leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        </>
      ) : (
        <>
          <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors shrink-0 relative z-10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{title}</h3>
              {badge !== undefined && badge !== 0 && (
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', badgeColor)}>{badge}</span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          {rightSlot}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all relative z-10 shrink-0" />
        </>
      )}
    </motion.button>
  );
}
