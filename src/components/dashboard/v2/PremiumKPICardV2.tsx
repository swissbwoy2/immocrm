import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface PremiumKPICardV2Props {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  description?: string;
  loading?: boolean;
  index?: number;
  onClick?: () => void;
  highlight?: boolean;
}

function TrendBadge({ trend, label }: { trend: number; label?: string }) {
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const colorClass = isFlat
    ? 'text-muted-foreground bg-muted/60'
    : isUp
    ? 'text-emerald-500 bg-emerald-500/10'
    : 'text-red-400 bg-red-400/10';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {isFlat ? 'Stable' : `${isUp ? '+' : ''}${trend}%`}
      {label && <span className="opacity-70">{label}</span>}
    </span>
  );
}

export function PremiumKPICardV2({
  title,
  value,
  unit,
  trend,
  trendLabel,
  icon: Icon,
  iconColor = 'text-primary',
  description,
  loading = false,
  index = 0,
  onClick,
  highlight = false,
}: PremiumKPICardV2Props) {
  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={[
        'relative rounded-2xl p-5 border transition-all duration-300 group text-left w-full overflow-hidden',
        highlight
          ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30 shadow-[0_0_30px_hsl(217_91%_60%/0.12)]'
          : 'bg-card/80 backdrop-blur-sm border-border/60 hover:border-primary/30 hover:shadow-[0_8px_30px_hsl(217_91%_60%/0.10)]',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
          {Icon && (
            <div className={`p-2 rounded-xl bg-primary/10 ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 mt-1">
            <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
                {typeof value === 'number' ? value.toLocaleString('fr-CH') : value}
              </span>
              {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {trend !== undefined && <TrendBadge trend={trend} label={trendLabel} />}
              {description && <span className="text-xs text-muted-foreground">{description}</span>}
            </div>
          </>
        )}
      </div>
    </Tag>
  );
}
