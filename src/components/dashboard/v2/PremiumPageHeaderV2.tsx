import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';


interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PremiumPageHeaderV2Props {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function PremiumPageHeaderV2({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
  className = '',
}: PremiumPageHeaderV2Props) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-3 border-b border-border/40 ${className}`}
    >
      <div className="space-y-1.5 min-w-0">

        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-foreground transition-colors cursor-pointer">
                    {crumb.label}
                  </a>
                ) : (
                  <span className={i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight break-words">{title}</h1>
          {badge}
        </div>


        {subtitle && (
          <p className="text-sm text-muted-foreground max-w-xl">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </motion.div>
  );
}
