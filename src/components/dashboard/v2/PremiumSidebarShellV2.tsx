import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface SidebarSectionItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string | number;
  active?: boolean;
}

interface SidebarSection {
  title?: string;
  items: SidebarSectionItem[];
}

interface PremiumSidebarShellV2Props {
  sections: SidebarSection[];
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function PremiumSidebarShellV2({
  sections,
  header,
  footer,
  className = '',
}: PremiumSidebarShellV2Props) {
  return (
    <aside
      className={`flex flex-col h-full bg-sidebar backdrop-blur-xl border-r border-sidebar-border overflow-hidden ${className}`}
    >
      {header && (
        <div className="p-4 border-b border-sidebar-border/60 shrink-0">{header}</div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-border">
        {sections.map((section, si) => (
          <div key={si} className="mb-2">
            {section.title && (
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none">
                {section.title}
              </p>
            )}
            {section.items.map((item, ii) => {
              const Icon = item.icon;
              return (
                <motion.a
                  key={ii}
                  href={item.href}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                  className={[
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group relative',
                    item.active
                      ? 'bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/20'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  ].join(' ')}
                >
                  {item.active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-sidebar-primary" />
                  )}
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sidebar-primary/20 text-sidebar-primary min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </motion.a>
              );
            })}
          </div>
        ))}
      </nav>

      {footer && (
        <div className="p-4 border-t border-sidebar-border/60 shrink-0">{footer}</div>
      )}
    </aside>
  );
}
