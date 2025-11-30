import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subtitle?: string;
  onClick?: () => void;
}

export function KPICard({ title, value, icon: Icon, variant = 'default', subtitle, onClick }: KPICardProps) {
  const variantClasses = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card 
      className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-muted-foreground truncate leading-tight">{title}</p>
            <h3 className="text-base sm:text-lg lg:text-2xl font-bold mt-0.5 sm:mt-1 lg:mt-2 truncate">{value}</h3>
            {subtitle && (
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-1.5 sm:p-2 lg:p-3 rounded-lg flex-shrink-0', variantClasses[variant])}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-6 lg:h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
