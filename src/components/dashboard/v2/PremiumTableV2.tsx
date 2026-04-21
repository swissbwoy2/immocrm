import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

interface PremiumTableV2Props<T> {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
  actions?: ReactNode;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string | number;
  className?: string;
  index?: number;
}

export function PremiumTableV2<T extends Record<string, unknown>>({
  title,
  subtitle,
  icon: Icon,
  columns,
  data,
  loading = false,
  searchable = false,
  searchKeys = [],
  emptyMessage = 'Aucune donnée',
  actions,
  onRowClick,
  rowKey,
  className = '',
  index = 0,
}: PremiumTableV2Props<T>) {
  const [query, setQuery] = useState('');

  const filtered = searchable && query.trim()
    ? data.filter((row) =>
        searchKeys.some((k) => {
          const val = row[k];
          return typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase());
        })
      )
    : data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 overflow-hidden ${className}`}
    >
      {(title || actions || searchable) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5 border-b border-border/40">
          {title && (
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
          )}
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8 h-8 text-xs w-48 bg-background/50"
                />
              </div>
            )}
            {actions}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/20">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <motion.tr
                  key={rowKey ? rowKey(row) : i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'border-b border-border/20 transition-colors duration-150',
                    onRowClick ? 'cursor-pointer hover:bg-primary/5' : 'hover:bg-muted/30',
                  ].join(' ')}
                >
                  {columns.map((col, j) => (
                    <td key={j} className={`px-4 py-3 text-foreground/90 ${col.className ?? ''}`}>
                      {col.render
                        ? col.render(row, i)
                        : String(row[col.key as keyof T] ?? '—')}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
