import { ReactNode, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface PremiumFormShellV2Props {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  className?: string;
  index?: number;
}

export function PremiumFormShellV2({
  title,
  subtitle,
  icon: Icon,
  children,
  actions,
  onSubmit,
  loading = false,
  className = '',
  index = 0,
}: PremiumFormShellV2Props) {
  const content = (
    <>
      {(title || subtitle) && (
        <div className="flex items-start gap-3 mb-6">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0 mt-0.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}

      <fieldset disabled={loading} className="space-y-5 disabled:opacity-60 disabled:pointer-events-none min-w-0">
        {children}
      </fieldset>

      {actions && (
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border/40">
          {actions}
        </div>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6 md:p-8 ${className}`}
    >
      {onSubmit ? (
        <form onSubmit={onSubmit} noValidate>
          {content}
        </form>
      ) : (
        content
      )}
    </motion.div>
  );
}
