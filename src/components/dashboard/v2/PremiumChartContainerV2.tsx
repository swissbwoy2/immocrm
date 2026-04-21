import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface PremiumChartContainerV2Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  minHeight?: number;
  className?: string;
  index?: number;
}

export function PremiumChartContainerV2({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  loading = false,
  minHeight = 280,
  className = '',
  index = 0,
}: PremiumChartContainerV2Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 overflow-hidden hover:border-primary/20 transition-colors duration-300 ${className}`}
    >
      <div className="flex items-center justify-between p-5 border-b border-border/40">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-xl bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="p-5" style={{ minHeight }}>
        {loading ? (
          <div className="h-full flex flex-col gap-3 justify-center" style={{ minHeight }}>
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
            <div className="h-full w-full rounded-xl bg-muted/60 animate-pulse" style={{ minHeight: minHeight - 60 }} />
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
}
