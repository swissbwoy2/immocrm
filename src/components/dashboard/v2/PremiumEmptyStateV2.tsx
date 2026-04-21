import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Inbox } from 'lucide-react';

interface PremiumEmptyStateV2Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function PremiumEmptyStateV2({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
  compact = false,
}: PremiumEmptyStateV2Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-10 px-6' : 'py-16 px-8',
        className,
      ].join(' ')}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150 opacity-60" />
        <div className="relative p-4 rounded-2xl bg-primary/10 border border-primary/20">
          <Icon className={`text-primary ${compact ? 'h-8 w-8' : 'h-10 w-10'}`} />
        </div>
      </div>

      <h3 className={`font-semibold text-foreground mb-2 ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  );
}
